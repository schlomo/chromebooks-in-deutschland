#!/bin/sh
if [ "$(basename $(pwd))" == aws ]; then
    cd ..
fi
exec \
    docker run --rm \
    -e CLOUDRAIL_API_KEY \
    -v $(pwd):$(pwd) -u $(id -u):$(id -g) \
    -w $(pwd)/aws \
    indeni/cloudrail-cli \
    run \
        -d . \
        --tf-plan tf.plan \
        --origin ci \
        --build-link "https://$AWS_REGION.console.aws.amazon.com/codesuite/codebuild/$CODEBUILD_WEBHOOK_ACTOR_ACCOUNT_ID/projects/${CODEBUILD_BUILD_ID//:*}/build/$CODEBUILD_BUILD_ID" \
        --execution-source-identifier "Build $CODEBUILD_BUILD_NUMBER in aws" \
        --auto-approve \
        --verbose