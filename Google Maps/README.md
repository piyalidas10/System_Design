# Geospatial & Navigation System Design (e.g., Google Maps, Apple Maps)

## 1. Overview
A **Geospatial & Navigation System** provides worldwide interactive vector/raster map tile rendering, location search (Geocoding/Reverse Geocoding), real-time traffic aggregation, and turn-by-turn shortest/fastest route navigation (ETA calculation) across global road networks.

---

## 2. Requirements

### Functional Requirements
- **Map Rendering**: Render map tiles dynamically across zoom levels (Zoom 0 to 21) based on viewport bounding box.
- **Geocoding & Location Search**: Convert text addresses to GPS coordinates (Latitude, Longitude) and vice versa.
- **Route Planning & Navigation**: Calculate fastest/shortest route between Origin and Destination considering road types, one-ways, speed limits, and live traffic.
- **ETA (Estimated Time of Arrival)**: Accurate arrival time calculation updated dynamically with traffic conditions.
- **Location Tracking**: Continuously update user GPS positions for live turn-by-turn guidance.

### Non-Functional Requirements
- **Ultra-Fast Tile Loading**: Sub-50ms tile delivery latency globally.
- **Low Route Computation Latency**: Complex multi-region routes calculated in < 1 second.
- **High Availability**: 99.999% availability for critical navigation.
- **Massive Scalability**: 1 Billion+ DAU, 50M concurrent active navigation sessions.

---

## 3. Capacity Estimation

### Assumptions
- **Daily Active Users (DAU)**: 1 Billion.
- **Active Navigating Users at Peak**: 50 Million concurrent drivers.
- **GPS Location Update Frequency**: Every 4 seconds.
- **GPS Ingestion QPS**: $50 \times 10^6 / 4 = 12.5 \text{ Million QPS}$.
- **Route Calculations**: 100 Million route requests/day $\implies \approx 1,200 \text{ QPS}$ (Peak: 10,000 QPS).
- **Map Tile Storage**: Global vector map data across 21 zoom levels $\approx 100 \text{ TB}$.

---

## 4. High-Level Architecture (HLD)

```mermaid
graph TD
    Client[Mobile App / Web Map SDK] --> CDN[Global Edge CDN (Map Tile Cache)]
    CDN -.->|Tile Miss| TileService[Map Tile Rendering Service]
    TileService --> TileDB[(Pre-rendered Vector Tile Store: S3 / RocksDB)]

    Client --> API_GW[API Gateway / Load Balancer]

    subgraph Navigation & Routing
        API_GW --> RouteService[Navigation & Routing Service]
        RouteService --> RoutingEngine[Shortest Path Engine: A* / Contraction Hierarchies]
        RouteService --> TrafficEngine[Real-Time Traffic Aggregator]
        RoutingEngine --> RoadGraphDB[(Road Network In-Memory Graph)]
    end

    subgraph Location & Geocoding
        API_GW --> SearchService[Geocoding & POI Search]
        SearchService --> SpatialDB[(Spatial Index: PostGIS / S2 / H3 / QuadTree)]
    end

    subgraph Live Traffic Ingestion
        Client -->|Live GPS Stream: Lat, Lon, Speed| Kafka[GPS Stream: Kafka]
        Kafka --> Flink[Stream Processor: Apache Flink]
        Flink --> TrafficEngine
        TrafficEngine --> TrafficCache[(Live Segment Speeds: Redis)]
    end
```

---

## 5. Architectural Deep Dives

### 5.1 Geospatial Indexing & Spatial Partitioning
How do we find nearby roads, POIs, or drivers quickly without scanning all global coordinates?

```
Geospatial Indexing Paradigms:
1. Geohash: Base32 string encoding interleaving Lat/Lon bits (Hierarchical bounding boxes).
2. QuadTree: 2D space recursively subdivided into 4 quadrants (NW, NE, SW, SE).
3. Google S2: Projects Earth onto a cube, subdivided using Hilbert Space-Filling Curves (64-bit integer IDs).
4. Uber H3: Hexagonal hierarchical spatial index (ideal for uniform distance calculations).
```

```
QuadTree Space Partitioning:
┌───────────┬───────────┐
│  NW (00)  │  NE (01)  │
│           │   ┌───┬───┤
│           │   │ 0 │ 1 │
├───────────┼───┼───┼───┤
│  SW (10)  │   │ 2 │ 3 │
│           │   └───┴───┤
│           │  SE (11)  │
└───────────┴───────────┘
```

### 5.2 Map Tiling System (Slippy Map)
- The globe is projected using **Web Mercator (EPSG:3857)**.
- At Zoom Level $Z$, the world is split into $2^Z \times 2^Z$ tiles of $256 \times 256$ pixels.
- Tile coordinates: `https://tile.service.com/{zoom}/{x}/{y}.pbf` (Mapbox Vector Tile format).
- Vector tiles contain geometry layers (roads, buildings, rivers), rendered client-side on GPU using OpenGL/Metal/WebGL for smooth zooming and rotation.

### 5.3 Routing Algorithms: Dijkstra vs. A* vs. Contraction Hierarchies (CH)
- **Standard Dijkstra**: Explores uniformly in all directions ($O(V \log V + E)$) $\to$ Too slow for continent-wide graphs (hundreds of millions of edges).
- **A* Algorithm**: Heuristic-guided search directing exploration toward destination using straight-line distance ($h(n)$ Euclidean distance).
- **Contraction Hierarchies (CH) (Industry Standard)**:
  - **Preprocessing Phase**: Pre-contracts unimportant nodes (local streets) by adding shortcut edges between major highway intersections.
  - **Query Phase**: Bi-directional search moving only upward in node hierarchy from origin and destination, meeting at high-speed expressways in $< 10\text{ms}$.

```
Contraction Hierarchies:
Origin (Local Street) ──► Secondary Road ──► Highway ──► Inter-State Expressway
                                                              │
                                                              ▼
Destination (Local Street) ◄── Secondary Road ◄── Highway ◄──┘
```

### 5.4 Real-Time Traffic & ETA Calculation
- GPS pings (`lat, lon, speed, heading, timestamp`) from navigating users are matched to road segments using **Hidden Markov Models (HMM)** (Map Matching).
- **Apache Flink** calculates rolling 5-minute average speed per road segment ID.
- Dynamic road segment weights = $\text{Length} / \text{Live Speed}$.
- ETA dynamically updates and prompts rerouting if significant traffic bottlenecks arise.

---

## 6. Data Model

```sql
-- PostGIS Spatial Road Graph Table
CREATE TABLE road_segments (
    segment_id BIGINT PRIMARY KEY,
    start_node BIGINT NOT NULL,
    end_node BIGINT NOT NULL,
    road_type VARCHAR(32) NOT NULL, -- motorway, primary, residential
    length_meters DOUBLE PRECISION NOT NULL,
    base_speed_limit_kmh INT NOT NULL,
    is_one_way BOOLEAN DEFAULT FALSE,
    geom GEOMETRY(LineString, 4326) NOT NULL
);

CREATE INDEX idx_road_geom ON road_segments USING GIST(geom);
```

---

## 7. Key Takeaways
- Use **Google S2 / Uber H3** for fast spatial lookups and proximity clustering.
- **Contraction Hierarchies** reduce continent-wide route calculation time from seconds to single-digit milliseconds.
- Pre-render vector tiles and cache them globally at CDN Edge nodes for instant 60fps panning/zooming.
