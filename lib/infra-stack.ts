import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

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
      keyPair: ec2.KeyPair.fromKeyPairName(this, 'MyKeyPair', 'my-key-pair'), // Replace with your key pair name
    });

    // User data to install Docker and run the app
    instance.addUserData(
      'yum update -y',
      'amazon-linux-extras install docker -y',
      'service docker start',
      'usermod -a -G docker ec2-user',
      'docker run -d -p 3000:3000 your-docker-image' // Replace with your Docker image
    );

    // Output the instance public IP
    new cdk.CfnOutput(this, 'InstancePublicIp', {
      value: instance.instancePublicIp,
    });
  }
}
