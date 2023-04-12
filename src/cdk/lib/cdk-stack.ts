import * as cdk from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { AssetImage, Cluster, FargateService, FargateTaskDefinition, LogDrivers } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancer, ApplicationProtocol, ListenerCertificate } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create shared networking for our cluster/load balancer
    // Note: We wouldn't normally create this for just one service, instead we would likely have a shared one per aws account/environment.
    const vpc = new Vpc(this, 'Vpc', {
      maxAzs: 2,
    });

    // Create a cluster to run our application
    // Note: We wouldn't normally create this for just one service
    const cluster = new Cluster(this, 'Cluster', {
      vpc, // Must provide shared vpc, else the cluster will define it's own one
      enableFargateCapacityProviders: true, // Enable capacity provider
    });

    const image = AssetImage.fromAsset(`${__dirname}/../../`, { file: 'Workshop.Api/Dockerfile' });

    // Because we are using fargate, we create a `FargateTaskDefinition`, otherwise we would use an `Ec2TaskDefinition`.
    const taskDefinition = new FargateTaskDefinition(this, 'TaskDef');
    // Add our applicaiton container to the task def
    taskDefinition.addContainer('Api', {
      image: image, // Use our application image (required)
      portMappings: [{ // Define port mappings for the container (for this container we only have port 80 for HTTP)
        containerPort: 80,
      }],
      logging: LogDrivers.awsLogs({
        streamPrefix: 'api',
        logRetention: RetentionDays.ONE_DAY,
      }),
    });

    // Because we are using fargate, we create a `FargateService`, otherwise we would use an `Ec2Service`.
    const service = new FargateService(this, 'Service', {
      cluster, // Shared cluster
      taskDefinition, // Our task defintion
      circuitBreaker: {
        rollback: true,
      }
    });

    // Create a load balancer for our service
    const loadBalancer = new ApplicationLoadBalancer(this, 'ALB', {
      vpc, // Shared vpc
      internetFacing: true, // Set the load balancer as internet facing so we can connect to it
    });
    // Create an HTTP listener to connect to our service
    const listener = loadBalancer.addListener('Http', {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
    });

    // Add our service as a default target for this listener
    listener.addTargets('App', {
      protocol: ApplicationProtocol.HTTP,
      targets: [
        // Create a service target, pointing to our api container
        service.loadBalancerTarget({
          containerName: 'Api',
          // The default `containerPort` is the first port mapping of our container.
          // If we only have one port mapping then this is optional
          // containerPort: 80,
        }),
      ]
    });

    // Export the load balancer DNS name so we can see it after our deployment
    this.exportValue(loadBalancer.loadBalancerDnsName);
  }
}
