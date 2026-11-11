import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { HttpApi, HttpMethod, HttpStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { CfnUserPoolGroup, UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import {
  AllowedMethods, CachePolicy, Distribution, Function as CfFunction, FunctionCode, FunctionEventType,
  OriginRequestPolicy, ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { fileURLToPath } from 'node:url';

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));

export class KnightsStack extends Stack {
  constructor(scope: import('constructs').Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // --- Data ---
    const table = new Table(this, 'Table', {
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: RemovalPolicy.RETAIN, // never lose game history on stack deletion
    });

    // --- Admin auth (no self sign-up; create admins with the CLI, see README) ---
    const pool = new UserPool(this, 'Admins', {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      removalPolicy: RemovalPolicy.RETAIN,
      userInvitation: {
        emailSubject: 'You have been invited to the Knights team site',
        emailBody: 'Hi! You have been invited to the team site. Sign in with your email address ({username}) and this temporary password: {####}. You will be asked to choose a new password.',
      },
    });
    // Role = group. Admins manage everything; players can view the members-only gallery. No group = guest.
    new CfnUserPoolGroup(this, 'AdminsGroup', { userPoolId: pool.userPoolId, groupName: 'admins', description: 'Site administrators' });
    new CfnUserPoolGroup(this, 'PlayersGroup', { userPoolId: pool.userPoolId, groupName: 'players', description: 'Players and families: can view the gallery' });
    const client = new UserPoolClient(this, 'WebClient', { userPool: pool, generateSecret: false, authFlows: { userSrp: true } });

    // Player photos: separate from the site bucket so site deploys never prune them.
    const photoBucket = new Bucket(this, 'Photos', { blockPublicAccess: BlockPublicAccess.BLOCK_ALL, removalPolicy: RemovalPolicy.RETAIN });

    // Members-only gallery images: fully private (no CloudFront, no public access). Only signed, 15-minute links
    // minted by the API for signed-in members can read them.
    const galleryBucket = new Bucket(this, 'Gallery', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL, encryption: BucketEncryption.S3_MANAGED, enforceSSL: true, removalPolicy: RemovalPolicy.RETAIN,
    });

    // --- API ---
    const fn = new NodejsFunction(this, 'ApiFn', {
      entry: root('api/src/handler.ts'),
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(15),
      environment: { TABLE_NAME: table.tableName, PHOTO_BUCKET: photoBucket.bucketName, GALLERY_BUCKET: galleryBucket.bucketName, USER_POOL_ID: pool.userPoolId },
      bundling: { minify: true, target: 'node20' },
    });
    table.grantReadWriteData(fn);
    photoBucket.grantPut(fn);
    galleryBucket.grantReadWrite(fn); // read is needed so the Lambda's signed GET links work; delete for album cleanup
    fn.addToRolePolicy(new PolicyStatement({
      actions: ['cognito-idp:ListUsersInGroup', 'cognito-idp:AdminCreateUser', 'cognito-idp:AdminAddUserToGroup', 'cognito-idp:AdminDeleteUser'],
      resources: [pool.userPoolArn],
    }));

    const api = new HttpApi(this, 'Api', { createDefaultStage: false });
    // Throttle the whole API.
    new HttpStage(this, 'Stage', { httpApi: api, autoDeploy: true, throttle: { rateLimit: 25, burstLimit: 50 } });
    const integration = new HttpLambdaIntegration('Lambda', fn);
    const jwt = new HttpJwtAuthorizer('Jwt', `https://cognito-idp.${this.region}.amazonaws.com/${pool.userPoolId}`, { jwtAudience: [client.userPoolClientId] });
    // Public reads: an explicit list, so a new private route can never be exposed by a catch-all GET.
    for (const c of ['players', 'games', 'posts', 'checkins']) api.addRoutes({ path: `/api/${c}`, methods: [HttpMethod.GET], integration });
    // RSVP: players and admins only (token required here; the Lambda checks the group).
    api.addRoutes({ path: '/api/games/{id}/checkin', methods: [HttpMethod.POST], integration, authorizer: jwt });
    // Members-only and admin-only areas: a valid token is required here, and the Lambda then enforces the group.
    const all = [HttpMethod.GET, HttpMethod.PUT, HttpMethod.POST, HttpMethod.DELETE];
    api.addRoutes({ path: '/api/gallery/{proxy+}', methods: all, integration, authorizer: jwt });
    api.addRoutes({ path: '/api/members', methods: all, integration, authorizer: jwt });
    api.addRoutes({ path: '/api/members/{proxy+}', methods: all, integration, authorizer: jwt });
    api.addRoutes({ path: '/api/{proxy+}', methods: [HttpMethod.PUT, HttpMethod.POST, HttpMethod.DELETE], integration, authorizer: jwt });

    // --- Site ---
    const bucket = new Bucket(this, 'Site', { blockPublicAccess: BlockPublicAccess.BLOCK_ALL, removalPolicy: RemovalPolicy.DESTROY, autoDeleteObjects: true });
    const spaRewrite = new CfFunction(this, 'SpaRewrite', {
      code: FunctionCode.fromInline(`function handler(e){var r=e.request;if(r.uri.indexOf('.')===-1){r.uri='/index.html';}return r;}`),
    });
    const dist = new Distribution(this, 'Cdn', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [{ function: spaRewrite, eventType: FunctionEventType.VIEWER_REQUEST }],
      },
      additionalBehaviors: {
        '/photos/*': {
          origin: S3BucketOrigin.withOriginAccessControl(photoBucket),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        },
        '/api/*': {
          origin: new HttpOrigin(`${api.apiId}.execute-api.${this.region}.amazonaws.com`),
          viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER, // forwards Authorization
        },
      },
    });

    new BucketDeployment(this, 'Deploy', {
      destinationBucket: bucket,
      distribution: dist,
      distributionPaths: ['/*'],
      sources: [
        Source.asset(root('web/dist'), { exclude: ['config.json'] }),
        Source.jsonData('config.json', { apiUrl: '/api', userPoolId: pool.userPoolId, clientId: client.userPoolClientId }),
      ],
    });

    new CfnOutput(this, 'SiteUrl', { value: `https://${dist.distributionDomainName}` });
    new CfnOutput(this, 'UserPoolId', { value: pool.userPoolId });
  }
}
