# CDK Workshop

### Aim
Publish & Deploy a docker application via CDK application.

### Setup

1. In a terminal, navigate to `./src/cdk`
2. Initialise a new cdk app using `npx aws-cdk init --language=typescript`
3. Open `src/cdk/bin/cdk.ts` and:
    * Update the `new CdkStack` line, replace `'CdkStack'` with `'CdkWorkshop-YourName'` (this will become the stack name, and should be unique)
    * Uncomment/replace configuration for account/region with `env: { account: '{{todo}}', region: 'ap-southeast-2' }` to configure the stack for environment
4. Open `src/cdk/lib/cdk-stack.ts`, this is where we will be creating our stack resources

### CDK Resources

The following resources need to be defined in our stack:

* `Vpc`
* `Cluster`
    * Will be used to run our application
    * Must be linked to our vpc
    * Must have fargate capacity provider enabled
* `AssetImage`
    * Builds & Publishes our docker image
    * _Note: This should look like ``AssetImage.fromAsset(`${__dirname}/../../`, { file: 'Workshop.Api/Dockerfile' });``_
        * First argument is the build context (the `src` directory)
        * `file:` option points to our applicationm
* `FargateTaskDefinition`
    * Must add a container using our image
* `FargateService`
    * Should have `circuitBreaker` enabled
* `ApplicationLoadBalancer`
    * Must be linked to our vpc
    * Must be internetFacing
    * Must have a listener using http, with our service as a target

### Deploying our Application

_Note: For all of the cdk commands following, you should pass the `--profile` argument, selecting the profile which has credentials for the aws account you're using._

1. Synthesize the CDK application using `npm run cdk -- synth`
    * You will see a new folder created named `cdk.out`
    * This folder will contain:
        * An `asset.*` folder containing the files required to build our image
        * A cloudformation template `CdkStack.template.json`
2. Deploy the CDK using either `npm run cdk -- deploy` or `npm run cdk -- deploy --app cdk.out` (the latter can be used to deploy the output from synth)
3. Check your application is running