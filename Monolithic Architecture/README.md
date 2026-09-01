# Monolithic Architecture

At this point, it is very important to clear up a common confusion.

People often mix up monolithic architecture with layered architecture as if they are the same thing, but actually they refer to two completely different aspects of your system.

**A monolith is a deployment strategy. It means your entire application, regardless of how it is structured internally, is packaged and deployed as a single unit.**

**On the other hand, a layered architecture is a design strategy. It is about how you organize code within your application, usually into logical layers like UI, business logic and data access.**

So yes, you can absolutely have both of them in one application. They too can co-exist together. In fact, many well structured monoliths are layered internally.

So when someone says we are stuck with a monolith, remember the design quality inside that monolith still matters a lot. It could be layered or it could not be layered.

## Characteristics
Monolithic architecture exhibits several defining characteristics:
- Single Codebase: All components are developed and maintained in one codebase, simplifying management.
- Shared Memory: Components communicate efficiently using the same memory space without network overhead.
- Centralized Database: A single database instance handles all data storage.
- Layered Structure: Separate layers (data, business logic, presentation) exist but may create inter-layer dependencies.
- Limited Scalability: Scaling requires the whole application, often causing inefficiencies and higher resource use.
- Simpler Development & Deployment: Easier to build, test, and deploy since everything is in one codebase.

## Components
The key components of a monolithic architecture are:
1. **User Interface (UI):** Handles user interaction through buttons, forms, and other elements.
2. **Application Logic:** Contains the main functionality, processes UI requests, and performs computations.
3. **Data Access Layer:** Manages database interactions, enabling data querying, insertion, updating, and deletion.
4. **Database:** Stores application data in relational, NoSQL, or other formats as needed.
5. **External Dependencies:** Connects with third-party APIs, authentication providers, or messaging queues for added functionality.
6. **Middleware:** Handles cross-cutting concerns like logging, security, performance, and inter-component communication.

## Scaling Monolithic Systems
Scaling monolithic systems can be challenging due to their inherent design, but several strategies can help alleviate these challenges:
1. **Vertical scaling:** Vertical scaling is also known as scale-up, this involves increasing existing server or virtual machine resources (such as CPU, memory, or storage) when running a monolithic application.
2. **Performance Optimization:** Identifying and optimizing operational bottlenecks in single-function operations. This might involve profiling the application to find areas of inefficiency, optimizing database queries, improving algorithmic complexity, or reducing unnecessary resource usage
3. **Caching:** Strengthen caching options to reduce the load on external services. By saving frequently accessed data or statistical results, you can reduce the strain on the application and improve response time.
4. **Load Balancing:** Use load balancing to distribute incoming traffic across multiple instances of a monolithic application. This can help divide the work more evenly and improve scalability.
5. **Database sharding:** If the database is a bottleneck, consider sharding the database to share data across multiple database instances. Each shard stores a small portion of the data, allowing for horizontal scaling of the database.

## when is a monolith actually the right choice?

1. **Startup and MVP's:** The truth is, monoliths are still a great fit for many real world situations, especially in the early stage of product, for example startup and MVP's. When you are trying to validate an idea quickly, you want to move fast. A monolith gives you speed, focus, and simplicity. You don't need the complexity of microservices just to test your product market fit.
2. **Internal Tools:** Then you have your internal tools. Many dashboards, reporting systems, or admin panels used by a single team works perfectly well as monolith. There is no need to introduce service boundaries when everything is managed and used in-house.
3. **Single team projects:** Then we have single team projects. When your team is small and communication is easy, a monolith helps keep your code centralized and collaborative. You avoid the overhead of service ownership and enter team contracts.
4. **Early stage products:** Then early stage products you are still figuring out your core features. Requirements change rapidly. Starting with a monolith in this scenario lets you iterate without the friction of coordinating multiple services.

