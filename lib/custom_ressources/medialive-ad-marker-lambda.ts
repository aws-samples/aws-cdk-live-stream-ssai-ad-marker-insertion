/*********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import {
  custom_resources,
  Aws,
  aws_iam as iam,
  Fn,
  aws_lambda as lambda
} from "aws-cdk-lib";

import { Construct } from "constructs";

export interface IConfigProps {
  mediaLiveChannel: string;
}

export class AdMarkerLambda extends Construct {
  constructor(scope: Construct, id: string, props: IConfigProps) {
    super(scope, id);

    //extracting the MediaLive channel ID from the ARN 
    const channelEML = Fn.select(6, Fn.split(":", props.mediaLiveChannel));

    // 👇 Create the Lambda to start MediaLive
    const createLambdaMediaLive = new lambda.Function(this, "admarkerEMLLambda", {
      functionName: Aws.STACK_NAME + "_EML_AdMarker",
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset("lib/lambda/insert_ad_marker_function"),
      handler: 'index.lambda_handler',
    });
    // add the policy to the Function's role
    const mediaLiveLambdaPolicy = new iam.PolicyStatement({
      actions: ['medialive:BatchUpdateSchedule', 'medialive:DescribeChannel', 'medialive:DescribeInput', 'medialive:DescribeSchedule', 'medialive:ListChannels', 'medialive:ListInputs', 'medialive:DeleteSchedule'],
      resources: ['*'],
    });
    createLambdaMediaLive.role?.attachInlinePolicy(
      new iam.Policy(this, 'mediaLiveAccess', {
        statements: [mediaLiveLambdaPolicy],
      }),
    );
    new custom_resources.AwsCustomResource(this, "admarkerEML", {
      onCreate: {
        service: "Lambda",
        action: "invoke",
        parameters: {
          FunctionName: Aws.STACK_NAME + "_EML_AdMarker",
          Payload: `{"mediaLiveChannelId":"${channelEML}"}`
        },
        physicalResourceId: custom_resources.PhysicalResourceId.of(
          "admarkerEMLResourceId"
        ),
      },
      policy: custom_resources.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["lambda:InvokeFunction"],
          resources: [createLambdaMediaLive.functionArn],
        }),
      ])
    });
  }
}
