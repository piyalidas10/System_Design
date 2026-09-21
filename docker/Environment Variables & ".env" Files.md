# Environment Variables & ".env" Files

Stop if any container is already runnuning.
```
# Stop docker conatiner feedback-app
docker stop feedback-app

# build new docker image
docker build -t feedback-node:env .

# run container using env file configuration
docker run -d --rm -p 3000:8000 --env-file ./.env --na me feedback-app -v feedback:/app/feedback -v "/Users/maximilianschwarzmu ller/development/teaching/udemy/docker-complete:/app:ro" -v /app/node_mo dules -v /app/temp feedback-node:env
```

<img src="./imgs/Environment Variables & env Files.png" width="100%" />
