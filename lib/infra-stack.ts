import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC
    const vpc = new ec2.Vpc(this, 'TaskManagerVpc', {
      maxAzs: 2, // Default is all AZs in region
    });

    // Create a security group
    const securityGroup = new ec2.SecurityGroup(this, 'TaskManagerSG', {
      vpc,
      description: 'Allow SSH and HTTP access',
      allowAllOutbound: true,
    });

    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3000), 'Allow HTTP on port 3000');

    // Create an EC2 instance
    const instance = new ec2.Instance(this, 'TaskManagerInstance', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      securityGroup,
      keyPair: ec2.KeyPair.fromKeyPairName(this, 'MyKeyPair', 'task-manager-key'),
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    // Create ECR Repository
    const ecrRepo = new ecr.Repository(this, 'TaskManagerRepo', {
      repositoryName: 'task-manager',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Delete on cdk destroy
    });

    // Update user data to use the ECR image
    instance.addUserData(
      'yum update -y',
      'amazon-linux-extras install docker -y',
      'service docker start',
      'usermod -a -G docker ec2-user',
      `docker run -d -p 3000:3000 ${ecrRepo.repositoryUri}:latest`
    );

    // Output the ECR repository URI
    new cdk.CfnOutput(this, 'ECRRepositoryUri', {
      value: ecrRepo.repositoryUri,
    });

    // Output the instance public IP
    new cdk.CfnOutput(this, 'InstancePublicIp', {
      value: instance.instancePublicIp,
    });
  }
}
