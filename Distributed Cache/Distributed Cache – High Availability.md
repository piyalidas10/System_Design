# Distributed Cache – High Availability
Now let's combine everything we have learned.

**Our architecture contains:**
1. Application Layer
2. Distributed Caching Layer
3. Partitioned Cache Nodes
4. Primary and Secondary Replicas
5. Sentinel Cluster
Each partition has two replicas in this example.

**Replication is introduced to improve availability.**

```mermaid
flowchart TD
    %% Application Layer
    subgraph AppLayer [Application Layer]
        App[Read / Write requests]
    end

    %% Distributed Cache Layer
    subgraph CacheLayer [Distributed Cache Layer]
        %% Partition 1
        subgraph P1 [Partition 1]
            PA["Primary A<br>Write"]
            RA1["Replica A1<br>Read / Backup"]
            PA --> RA1
        end

        %% Partition 2
        subgraph P2 [Partition 2]
            PB["Primary B<br>Write"]
            RB1["Replica B1<br>Read / Backup"]
            PB --> RB1
        end
    end

    %% Sentinel Cluster
    subgraph Sentinel [Monitoring and Failover]
        SC["Sentinel Cluster<br>Health checks • Heartbeats • Failure detection • Replica promotion"]
    end

    %% Connections
    AppLayer --> CacheLayer
    CacheLayer <--> Sentinel

    %% Styling
    style AppLayer fill:#f0f3ff,stroke:#d0d7de,stroke-width:1px
    style CacheLayer fill:#ffffff,stroke:#d0d7de,stroke-width:1px
    style P1 fill:#effaf3,stroke:#d0d7de,stroke-width:1px
    style P2 fill:#effaf3,stroke:#d0d7de,stroke-width:1px
    style Sentinel fill:#fbf0ff,stroke:#d0d7de,stroke-width:1px
    
    style PA fill:#ffffff,stroke:#a2e9b9,stroke-width:1px
    style RA1 fill:#ffffff,stroke:#a6c8ff,stroke-width:1px
    style PB fill:#ffffff,stroke:#a2e9b9,stroke-width:1px
    style RB1 fill:#ffffff,stroke:#a6c8ff,stroke-width:1px
```
