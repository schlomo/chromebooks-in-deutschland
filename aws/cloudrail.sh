#!/bin/bash
if [ "$(basename $(pwd))" = aws ]; then
    cd ..
fi
AWS_ACCOUNT_ID=$(
    aws sts get-caller-identity --query Account --output text || \
    docker run --rm -e AWS_DEFAULT_REGION -e AWS_CONTAINER_CREDENTIALS_RELATIVE_URI amazon/aws-cli sts get-caller-identity --query Account --output text
)

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
        --build-link "https://$AWS_REGION.console.aws.amazon.com/codesuite/codebuild/$AWS_ACCOUNT_ID/projects/${CODEBUILD_BUILD_ID//:*}/build/$CODEBUILD_BUILD_ID" \
        --execution-source-identifier "Build $CODEBUILD_BUILD_NUMBER for $CODEBUILD_SOURCE_REPO_URL" \
        --auto-approve \
        --verbose