# Kubernetes
Kubernetes is an open source container orchestration tool that was originally developed and designed by engineers at Google. 
Google donated the Kubernetes project to the newly formed Cloud Native Computing Foundation in 2015.
Container orchestration tools provide a framework for managing containers and microservices architecture at scale. 
There are many container orchestration tools that can be used for container lifecycle management. 
Some popular options are Kubernetes, Docker Swarm, and Apache Mesos.

## Tutorials
1. What is Kubernetes? : https://www.youtube.com/watch?v=a-nWPre5QYI&t=2s


## How Kubernetes helps with container orchestration
Kubernetes orchestration allows you to build application services that span multiple containers, schedule containers across a cluster, scale those containers, and manage their health over time.

Kubernetes eliminates many of the manual processes involved in deploying and scaling containerized applications. You can cluster together groups of hosts, either physical or virtual machines, running Linux containers, and Kubernetes gives you the platform to easily and efficiently manage those clusters. 

More broadly, it helps you fully implement and rely on a container-based infrastructure in production environments. These clusters can span hosts across public, private, or hybrid clouds. For this reason, Kubernetes is an ideal platform for hosting cloud-native apps that require rapid scaling.

Kubernetes also assists with workload portability and load balancing by letting you move applications without redesigning them. 

Main components of Kubernetes:
- Cluster: A control plane and one or more compute machines, or nodes.
- Control plane: The collection of processes that control Kubernetes nodes. This is where all task assignments originate.
- Kubelet: This service runs on nodes and reads the container manifests and ensures the defined containers are started and running.
- Pod: A group of one or more containers deployed to a single node. All containers in a pod share an IP address, IPC, hostname, and other resources.


