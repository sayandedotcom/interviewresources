/**
 * The landing page's sample report — a verbatim capture of a real run
 * (Google · Software Engineer, Full Stack · Bengaluru, 20 questions,
 * 39 sources), so the marketing walkthrough shows the product's
 * actual output rather than invented copy.
 *
 * Prose, questions, prep notes and sources are exactly as generated. The one
 * deliberate departure is presentational: `components/how-it-works-section.tsx`
 * renders confidence at the top of the scale rather than this run's own
 * medium/low signals. Regenerate by re-exporting the stored report payload.
 */

export type SampleQuestion = {
  category: "dsa" | "system_design";
  question: string;
  rationale: string;
  prepNote: string;
  basis: "reconstructed" | "baseline";
  evidenceUrls: string[];
};

export type SampleResource = {
  url: string;
  title: string;
  why: string;
  kind:
    | "interview_experience"
    | "company_engineering"
    | "company_docs"
    | "discussion"
    | "video"
    | "other";
  access: "full_text" | "search_preview";
};

/** The form inputs this report was generated from, mirrored by the Target panel. */
export const SAMPLE_RESEARCH = {
  companyName: "Google",
  roleContext: "Software Engineer, Full Stack",
  location: "Bengaluru, Karnataka, India",
  rounds: ["dsa", "system_design"] as const,
  creditsCharged: 61,
  costUsd: 0.47,
} as const;

export const SAMPLE_REPORT = {
  companySnapshot:
    "Google operates massive-scale distributed platforms serving billions of users globally. Its engineering culture heavily prioritizes scalability, system reliability, production-grade coding standards, and deep reasoning around architecture and data models.",

  companyExplainer:
    "Google is a global technology leader known for its flagship search engine, cloud services, and software platforms. It builds tools that help people find information, collaborate, and navigate their daily lives. A familiar example is Google Maps, which calculates optimal routes and estimates traffic in real time for drivers worldwide.",

  likelyLoopStructure:
    "The process generally begins with a recruiter screen and an initial technical phone screen focused on Data Structures and Algorithms (DSA). The onsite loop typically involves 3-5 coding rounds evaluating DSA and code quality, at least 1 System Design round (for mid-level and above), and a 'Googliness' and Leadership behavioral round. Some recent interviews have reportedly included a code review round to fix flawed code.",

  interviewerSummary:
    "Komal Tanwani (Recruiter): Coordinated the process for an engineering candidate, providing preparatory materials and insights into the round structures.",

  skillsRequired: [
    {
      skill: "Large-Scale System Design",
      why: "The role involves building core foundation elements and developer platforms that must handle billions of users and immense data volume reliably.",
    },
    {
      skill: "Advanced Data Structures & Algorithms",
      why: "Google coding rounds heavily test deep algorithmic thinking (graphs, dynamic programming, BFS/DFS, DSU) to ensure efficient data processing.",
    },
    {
      skill: "Production-Grade Coding",
      why: "Interviewers expect code to be modular, maintainable, and well-named, treating technical screens as evaluations of production readiness.",
    },
    {
      skill: "Distributed Caching & Concurrency",
      why: "Candidates must navigate scaling, parallel processing, and asynchronous logic to support responsive, robust core services.",
    },
    {
      skill: "Trade-off Communication",
      why: "Engineers must clearly articulate architectural decisions, assumptions, and failure scenarios when designing high-level and low-level systems.",
    },
  ],

  questions: [
    {
      category: "dsa",
      basis: "reconstructed",
      question:
        "You are given an undirected graph with $N$ nodes. Implement a function `findLongestCycle(n, edges)` that returns the length of the longest cycle. If there are no cycles, return -1. Write production-level, modular code in Java, Python, or Go. Analyze the time and space complexity of your approach.",
      rationale:
        "The exact practice wording was reconstructed from a December 2024 SWE-3 India candidate's account of finding the longest cycle in an undirected graph and a separate 2026 graduate account.",
      prepNote:
        "Prepare to detect cycles in an undirected graph using DFS or BFS. Standard DFS with distance tracking from the source is highly effective for calculating cycle lengths upon encountering a back-edge to an ancestor.",
      evidenceUrls: [
        "https://leetcode.com/discuss/post/6479658/google-l4-swe-3-india-offer-by-leethard-owg3",
        "https://www.reddit.com/r/leetcode/comments/1oerf7u/google_interview_experience_software_engineer",
      ],
    },
    {
      category: "dsa",
      basis: "reconstructed",
      question:
        "You are given a 3D grid representation of router coordinates $(x, y, z)$. Two routers are adjacent if they differ by at most 1 unit in any dimension. Use Union-Find (Disjoint Set Union) or BFS to identify the total number of distinct connected components of routers.\n\nFollow-up: Calculate the size of each component and identify if any two components have identical spatial layout structures (i.e., translation invariant).",
      rationale:
        "The exact practice wording was reconstructed from a successful Bangalore L5 interview experience mentioning routers, 3D BFS, and Union-Find, as well as an India L4 post citing component size calculations.",
      prepNote:
        "Practice Union-Find with path compression. To verify if components have identical patterns under translation, normalize coordinates by subtracting the bounding box minimums $(x_{min}, y_{min}, z_{min})$ and comparing the sorted sets.",
      evidenceUrls: [
        "https://leetcode.com/discuss/post/6349651/google-l5-bangalore-selected-interview-e-3wj2",
        "https://leetcode.com/discuss/post/6479658/google-l4-swe-3-india-offer-by-leethard-owg3",
      ],
    },
    {
      category: "dsa",
      basis: "reconstructed",
      question:
        "Implement a basic calculator that evaluates a mathematical string expression containing non-negative integers, `+`, `-`, `*`, `/`, and parentheses `(`, `)`. The input string may contain spaces.\n\nYour code must be clean, modular, and handle edge cases gracefully (like consecutive operators, negative results, or division by zero).\n\nFollow-up: How would you scale or parallelize this calculation if the expression was too large to fit in memory and had to be processed in a distributed pipeline?",
      rationale:
        "The exact practice wording was reconstructed from a May 2024 L5 Bangalore interview report where a variation of the 'Calculator' problem was asked alongside distributed system scaling follow-ups.",
      prepNote:
        "Master stack-based expression parsing (like Dijkstra's Shunting-yard or direct recursive descent). Google interviewers heavily evaluate production-level code hygiene, structured handling of operators, and clear state management.",
      evidenceUrls: [
        "https://leetcode.com/discuss/interview-experience/5529760/Google-or-L5-or-Bangalore-or-May-2024",
      ],
    },
    {
      category: "dsa",
      basis: "reconstructed",
      question:
        "You are given a list of software build targets and their respective dependency rules represented as a directed graph. Identify if there are any circular dependencies in the system. If none exist, output a valid compilation order (topological sort). Write highly modular, clean code and provide custom test cases to validate your solution, highlighting how you handle disconnected sub-graphs.",
      rationale:
        "The exact practice wording was reconstructed based on an India L4 experience detailing a dependency graph sitemap problem and an India SWE-3 report emphasizing custom test cases.",
      prepNote:
        "Master both BFS-based topological sort (Kahn's algorithm) and DFS cycle detection. Practice writing comprehensive, modular test cases including empty graphs, deep linear dependencies, and disconnected sub-graphs.",
      evidenceUrls: [
        "https://medium.com/@sshiwangi770/my-google-software-engineer-interview-experience-l4-46de5a70fb1f",
        "https://leetcode.com/discuss/post/6479658/google-l4-swe-3-india-offer-by-leethard-owg3",
      ],
    },
    {
      category: "dsa",
      basis: "reconstructed",
      question:
        "Design an in-memory queue manager that schedules task execution. Tasks are added dynamically with priorities. Implement the following operations:\n1. `addTask(taskId, priority)`: Inserts a task.\n2. `executeNext()`: Fetches and removes the highest priority task.\n3. `updatePriority(taskId, newPriority)`: Dynamically changes a task's priority.\n\nAll operations should run optimally in $O(\\log N)$ time or better. Write clean, complete code in Python, Java, or Go.",
      rationale:
        "The exact practice wording was reconstructed from an India L4 SWE-3 interview report outlining a queue management and asynchronous call logic system.",
      prepNote:
        "To achieve $O(\\log N)$ for all operations, use a min/max heap coupled with an internal hash map that tracks the heap indices of the tasks, allowing $O(1)$ lookup for `updatePriority` updates followed by bubble up/down.",
      evidenceUrls: [
        "https://leetcode.com/discuss/post/6479658/google-l4-swe-3-india-offer-by-leethard-owg3",
      ],
    },
    {
      category: "dsa",
      basis: "reconstructed",
      question:
        "Write a program to find the length of the longest cycle in an undirected, unweighted graph. The input is given as an adjacency list of V vertices and E edges. If there are no cycles in the graph, return -1. Your solution must run in O(V + E) time complexity. Clearly state how you distinguish visited nodes from parent nodes during your traversal. Additionally, design a set of unit test cases to validate edge cases, such as self-loops, disconnected components, and parallel edges.",
      rationale:
        "The exact practice wording was reconstructed from a December 2024 L4 interview in India where the candidate faced a cycle-detection graph problem with BFS/DFS and a follow-up to find the longest cycle.",
      prepNote:
        "Focus on using depth-first search (DFS) with distance tracking from the start node to calculate cycle lengths when a back-edge is detected. Ensure you handle undirected graph parent nodes properly.",
      evidenceUrls: [
        "https://leetcode.com/discuss/post/6479658/google-l4-swe-3-india-offer-by-leethard-owg3",
      ],
    },
    {
      category: "dsa",
      basis: "reconstructed",
      question:
        "You are given a 3D grid representing a network space of dimensions L x W x H. Some cells contain router nodes, while others are empty. Two routers are connected if they are adjacent in 3D space (up, down, left, right, forward, backward). Implement a system to:\n1. Determine the total number of connected router components using a Disjoint Set Union (DSU) data structure.\n2. Find the size of the largest connected router component using a 3D Breadth-First Search (BFS).\nState the time and space complexity of both approaches.",
      rationale:
        "The exact practice wording was reconstructed from a Google Bangalore L5 coding round which featured routers, 3D BFS, and Union-Find (UF) algorithms.",
      prepNote:
        "Practice mapping 3D coordinates (x, y, z) to 1D array indices for DSU. Be comfortable implementing clean BFS queues in 3D space while managing out-of-bounds checks efficiently.",
      evidenceUrls: [
        "https://leetcode.com/discuss/post/6349651/google-l5-bangalore-selected-interview-e-3wj2",
      ],
    },
    {
      category: "dsa",
      basis: "reconstructed",
      question:
        "Implement a calculator to evaluate a simple mathematical string expression containing non-negative integers, operators '+', '-', '*', '/', and parentheses '(', ')'. The string may also contain empty spaces. Introduce a custom priority constraint: addition and subtraction must have higher precedence than multiplication and division. Avoid using built-in evaluation functions (like 'eval()'). The solution must handle integer division truncation and run in O(N) time and space.",
      rationale:
        "The exact practice wording was reconstructed from a May 2024 Google Bangalore L5 interview where the candidate was asked a variation of the classic 'Calculator' problem.",
      prepNote:
        "Review classic shunting-yard algorithm variants or double-stack parsing approaches. Modifying precedence levels dynamically is a common Google follow-up.",
      evidenceUrls: [
        "https://leetcode.com/discuss/interview-experience/5529760/Google-or-L5-or-Bangalore-or-May-2024",
      ],
    },
    {
      category: "dsa",
      basis: "reconstructed",
      question:
        "You are given a weighted, undirected graph where each vertex has a specific color. You are also given a start node S, a target node T, and an integer budget K representing allowed 'color transitions'. A color transition occurs when moving from a node of one color to a node of a different color. Find the shortest path distance from S to T such that the total number of color transitions along the path does not exceed K. If no valid path exists, return -1.",
      rationale:
        "The exact practice wording was reconstructed from a September 2024 Indian University Graduate candidate account, where the base Dijkstra question had a difficult 'colored nodes' follow-up.",
      prepNote:
        "Solve this by state expansion in Dijkstra's algorithm. Track the shortest distance using a 2D table or state representation 'dist[node][transitions_used]' instead of a simple 1D array.",
      evidenceUrls: [
        "https://www.reddit.com/r/leetcode/comments/1oerf7u/google_interview_experience_software_engineer",
      ],
    },
    {
      category: "dsa",
      basis: "reconstructed",
      question:
        "Given a 2D binary grid representing a structured pixel layout, identify all connected components of 1s (using 8-directional connectivity). Two components share the 'same pattern' if they can be translated (without rotation or reflection) to perfectly overlap. \n1. Count the number of distinct components.\n2. Group them by their translationally identical shape patterns and return the count of unique patterns.\n3. Generate custom edge-case test cases (e.g., diagonal lines, hollow shapes) to validate your solution.",
      rationale:
        "The exact practice wording was reconstructed from an India L4 SWE 3 round in December 2024, requiring connected components identification, custom pattern clustering, and custom validation tests.",
      prepNote:
        "To represent patterns uniquely for translational equivalence, normalize the coordinates of each component by subtracting the minimum row and column values of that component, then serialize the relative coordinates as a key.",
      evidenceUrls: [
        "https://leetcode.com/discuss/post/6479658/google-l4-swe-3-india-offer-by-leethard-owg3",
      ],
    },
    {
      category: "system_design",
      basis: "reconstructed",
      question:
        "Design a distributed cache system similar to Redis. How would you handle key eviction policies, data replication, and partition tolerance? Discuss how you would minimize latency for multi-region setups.",
      rationale:
        "An L5 SWE candidate in Bengaluru reported being asked to design a distributed cache during their Google interview loop. The exact practice wording was reconstructed.",
      prepNote:
        "Focus on consistent hashing, cache eviction algorithms (e.g., LFU/LRU with approximations), master-slave replication, and trade-offs of active vs passive replication under the CAP theorem.",
      evidenceUrls: [
        "https://leetcode.com/discuss/post/6349651/google-l5-bangalore-selected-interview-e-3wj2",
      ],
    },
    {
      category: "system_design",
      basis: "reconstructed",
      question:
        "Design a TikTok-style Google News feed that aggregates articles and videos in near-real-time. Describe the content ingestion pipeline, ranking system integration, personalized delivery architecture, and how to scale this globally.",
      rationale:
        "An L5 SWE candidate in Bengaluru reported this specific topic (TikTok-style Google News feed) in their System Design round. The exact practice wording was reconstructed.",
      prepNote:
        "Ensure you clearly split push vs pull models for feed generation, address high-throughput ingestion of news metadata, and discuss media CDN caching strategies.",
      evidenceUrls: [
        "https://leetcode.com/discuss/post/6349651/google-l5-bangalore-selected-interview-e-3wj2",
      ],
    },
    {
      category: "system_design",
      basis: "baseline",
      question:
        "Design a connection-degree system for a professional networking site that can calculate first, second, and third-degree connections for users in real time. Optimize for low-latency queries at scale.",
      rationale:
        "The system design question was reported as a recent Google SWE interview question in candidate prep materials. The exact wording was reconstructed.",
      prepNote:
        "Focus on graph representation in memory vs disk, caching strategies for hot graphs, and distributed graph processing architectures.",
      evidenceUrls: [],
    },
    {
      category: "system_design",
      basis: "baseline",
      question:
        "Design a near-real-time logs and metrics ingestion and aggregation pipeline. The system must process millions of log lines per second from distributed services, allow real-time alerting, and support long-term analytics queries.",
      rationale:
        "This design prompt was reported as a recent Google SWE interview question in candidate prep resources. The exact wording was reconstructed.",
      prepNote:
        "Address decoupled pub-sub message queues (like Kafka or Pub/Sub), local log shippers, ingestion rate limiters, storage tiering (hot vs cold), and distributed search indexing.",
      evidenceUrls: [],
    },
    {
      category: "system_design",
      basis: "baseline",
      question:
        "Design an online collaborative document editing system (similar to Google Docs). Explain how you would handle real-time concurrency conflict resolution, scale the WebSocket connections, and maintain operational resilience.",
      rationale:
        "Collaborative document editing is cited as a classic distributed systems problem utilized for evaluating Google candidates. Wording is structured as baseline preparation.",
      prepNote:
        "Detail Operational Transformation (OT) or Conflict-free Replicated Data Types (CRDTs), and how to manage persistent state synchronization across multiple editing sessions.",
      evidenceUrls: [],
    },
    {
      category: "system_design",
      basis: "reconstructed",
      question:
        "Design a distributed in-memory cache system. The system must support low-latency get and set operations, scale horizontally across multiple nodes, handle hotkeys gracefully, and support eviction policies such as LRU. Walk through your choice of partitioning strategy, data structures on individual nodes, and consistency models (e.g., how you handle replication and node failures). Explain how clients discover and route requests to the correct cache node.",
      rationale:
        "The exact practice wording was reconstructed from a successful L5 interview loop in Bengaluru, India, where designing a distributed cache was a core system design requirement.",
      prepNote:
        "Focus on consistent hashing to distribute keys evenly and minimize reshuffling during scaling. Discuss how to handle hotkeys (such as local caching or dynamic replication of high-demand keys). Be prepared to explain inner data structures like hash maps combined with doubly-linked lists for LRU eviction, and detail peer-to-peer or configuration-service-based routing.",
      evidenceUrls: [
        "https://leetcode.com/discuss/post/6349651/google-l5-bangalore-selected-interview-e-3wj2",
      ],
    },
    {
      category: "system_design",
      basis: "reconstructed",
      question:
        "Design a personalized short-video media feed system like TikTok or Google News. The system should support sub-second feed delivery for millions of active users, handle massive write throughput for new uploads, and personal recommendations. Walk through your API design, data storage schemas, and the tradeoffs between push (fan-out-on-write) and pull (fan-out-on-read) models for content delivery.",
      rationale:
        "The exact practice wording was reconstructed from an L5 candidate interview experience in Bangalore where the candidate designed a TikTok-style Google News feed system.",
      prepNote:
        "Prepare to compare hybrid fan-out strategies. High-profile creators (celebrities) can overwhelm push systems, so pull or hybrid mechanisms work best for them. Detail caching tiers, CDN edge distribution, and how ranking services score and merge content with minimal latency.",
      evidenceUrls: [
        "https://leetcode.com/discuss/post/6349651/google-l5-bangalore-selected-interview-e-3wj2",
      ],
    },
    {
      category: "system_design",
      basis: "baseline",
      question:
        "Design a near-real-time logs and metrics ingestion and processing pipeline. The system must collect high-volume event data from thousands of microservices, process and index it, support real-time querying/dashboarding, and trigger immediate alerts for defined anomalies. Explain how you prevent data loss during high load spikes and handle out-of-order events.",
      rationale:
        "The exact practice wording was reconstructed from a reported system design topic for Google software engineering loops involving real-time log and metrics pipelines.",
      prepNote:
        "Highlight decoupling strategies using distributed messaging queues (e.g., Kafka or Pub/Sub). Discuss partitioning by service or log type, streaming windows (sliding vs. tumbling) for metric aggregation, and database choices (time-series databases vs. search indexes like Elasticsearch).",
      evidenceUrls: [],
    },
    {
      category: "system_design",
      basis: "reconstructed",
      question:
        "Design a highly concurrent asynchronous job execution queue system. Users submit API calls that are executed in the background by workers. The system must support job scheduling, retry mechanisms with exponential backoff, dead-letter queues for permanently failing jobs, and at-least-once or exactly-once execution guarantees. Explain how you prevent job starvation and scale the worker fleet dynamically.",
      rationale:
        "The exact practice wording was reconstructed from a Google India L4 SWE interview where DSA and system design were blended to build queue management and asynchronous logic.",
      prepNote:
        "Explain the storage state of your jobs (e.g., relational database, Key-Value store, or Redis) and worker locking mechanisms to prevent duplicate delivery. Detail distributed transactions, idempotency keys, and how workers poll or receive jobs from the broker securely.",
      evidenceUrls: [
        "https://leetcode.com/discuss/post/6479658/google-l4-swe-3-india-offer-by-leethard-owg3",
      ],
    },
    {
      category: "system_design",
      basis: "baseline",
      question:
        "Design a routing and traffic estimation system like Google Maps. The system must handle millions of route queries per second, process live GPS telemetry data to update traffic speeds dynamically, and calculate the fastest path between two coordinates. Explain how you partition the global road graph, represent dynamically changing edge weights, and optimize pathfinding calculations.",
      rationale:
        "The system design exercise was created based on Google's prominent core product capabilities and maps architecture preparation, with no direct reported target interview question evidence.",
      prepNote:
        "Break down the road network into hierarchical sub-graphs (e.g., bounding boxes or S2 cells). Discuss how static data is updated dynamically by stream processing pipelines streaming telemetry. Explain algorithms such as contraction hierarchies or A* with landmarks for real-time path estimation.",
      evidenceUrls: [],
    },
  ] satisfies SampleQuestion[],

  prepPlan: [
    "Review core data structures and algorithms, focusing on Graphs, Trees, BFS/DFS, Dynamic Programming, and Disjoint Set Union (DSU).",
    "Practice writing highly clean, modular, and well-named production-level code without syntax highlighting or autocomplete.",
    "Study distributed systems concepts such as caching, load balancing, sharding, replication, and concurrency management.",
    "Conduct mock system design interviews to practice scoping problems, clarifying requirements, and vocalizing architectural trade-offs.",
    "Prepare structured behavioral examples using the STAR method to demonstrate 'Googliness', leadership, and problem-solving history.",
  ],

  researchResources: [
    {
      url: "https://leetcode.com/discuss/interview-experience/5529760/Google-or-L5-or-Bangalore-or-May-2024",
      title: "Google | L5 | Bangalore | May 2024 - Discuss - LeetCode",
      why: "Target attributes were incomplete or conflicting. First-hand interview account for a mid-level Google Software Engineer role in Bengaluru, including detailed round-by-round descriptions, preparation strategy, and interview questions.",
      kind: "interview_experience",
      access: "full_text",
    },
    {
      url: "https://www.tryexponent.com/blog/google-system-design-interview",
      title: "What to Expect in Google's System Design Interview (2026)",
      why: "Target attributes were incomplete or conflicting. Detailed guide on Google's system design interview loop, covering expectations for different levels and types of questions.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://www.jobaajlearnings.com/blog/mastering-system-design-for-googleinterviews",
      title: "Mastering System Design for Google Interviews",
      why: "Target attributes were incomplete or conflicting. Comprehensive technical resource specifically for Google system design interviews.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://www.linkedin.com/pulse/google-interview-experience-software-engineer-1-hemant-bansal",
      title: "Google Interview Experience | Software Engineer",
      why: "Target attributes were incomplete or conflicting. Personal account of a software engineer interview at Google Bengaluru, sharing the recruiter interaction and preparation resources.",
      kind: "interview_experience",
      access: "full_text",
    },
    {
      url: "https://www.reddit.com/r/leetcode/comments/1oerf7u/google_interview_experience_software_engineer",
      title: "Google Interview Experience (Software Engineer, University Graduate 2026 – India)",
      why: "Target attributes were incomplete or conflicting. First-hand report from a 2026 University Graduate role in India, describing the current interview process and specific technical questions asked.",
      kind: "interview_experience",
      access: "full_text",
    },
    {
      url: "https://www.designgurus.io/blog/google-system-design-interview-questions-ultimate-guide",
      title: "google-system-design-interview-questions-ultimate-guide",
      why: "Target attributes were incomplete or conflicting. High-quality guide on Google-specific system design expectations, covering approach, failure handling, and specific internal systems.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://www.mockingly.ai/blog/company/google",
      title: "System Design Interview Questions Asked at Google | Mockingly",
      why: "Target attributes were incomplete or conflicting. Interview guide focusing on Google-specific system design challenges and distributed systems.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://www.teamblind.com/post/system-design-interview-for-google-how-to-study-6g0bshtv",
      title: "System design interview for Google. How to study?",
      why: "First-hand account of a Google system design interview, though for a senior/manager role rather than the targeted mid-level SWE.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://medium.com/@sshiwangi770/my-google-software-engineer-interview-experience-l4-46de5a70fb1f",
      title: "My Google [ Software Engineer ] Interview Experience | L4",
      why: "Target attributes were incomplete or conflicting. First-hand L4 Software Engineer interview experience in India.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://www.jointaro.com/interviews/companies/google/experiences/software-engineering-manager-bengaluru-april-1-2025-no-offer-negative-11d5bf39",
      title: "Google Software Engineering Manager Interview Experience - Taro",
      why: "Candidate reports an experience for a Software Engineering Manager role in Bengaluru. Relevant company and location, but the role is managerial, not the targeted SWE role.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://leetcode.com/discuss/interview-experience/1242231/rejections-to-multiple-offers-journey-experience-advice",
      title: "Rejections to Multiple Offers Journey | Experience | Advice - Discuss - LeetCode",
      why: "Compilation of various interviews, some of which are for Google (software engineer) in India, but it is a multi-company summary rather than a single-focused account.",
      kind: "interview_experience",
      access: "full_text",
    },
    {
      url: "https://www.reddit.com/r/leetcode/comments/1adzye8/my_google_interview_experience",
      title: "My Google Interview Experience : r/leetcode",
      why: "Target attributes were incomplete or conflicting. First-hand account of Google SWE interview process; provides insight into topic frequency.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://leetcode.com/discuss/post/6479658/google-l4-swe-3-india-offer-by-leethard-owg3",
      title:
        "Google | L4 | SWE 3 | India | Interview Experience & Journey | A Guide for DSA Dummies Like Me - Discuss - LeetCode",
      why: "Target attributes were incomplete or conflicting. First-hand account of L4 software engineer interview in India with detailed preparation tips and round-by-round structure.",
      kind: "interview_experience",
      access: "full_text",
    },
    {
      url: "https://leetcode.com/discuss/post/6349651/google-l5-bangalore-selected-interview-e-3wj2",
      title: "Google | L5 | Bangalore | Selected | Interview Experience - Discuss - LeetCode",
      why: "Target attributes were incomplete or conflicting. First-hand detailed account of an L5 Software Engineer interview in Bengaluru, including specific questions for coding and system design rounds.",
      kind: "interview_experience",
      access: "full_text",
    },
    {
      url: "https://www.systemdesignhandbook.com/blog/large-scale-distributed-systems",
      title: "A Guide to Large-Scale Distributed Systems (2026)",
      why: "General guide on distributed systems with sections referencing Google, Amazon, and Netflix interview prep.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://www.glassdoor.com/Interview/Google-Bangalore-Interview-Questions-EI_IE9079.0,6_IL.7,16_IM1091.htm",
      title: "Google Interview Questions in Bangalore - Bengaluru",
      why: "General landing page for interview reviews in Bangalore; contains no specific process insights.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://interviewing.io/blog/never-written-code-but-passed-google-system-design",
      title: "I've never written code, but I just passed a Google system ...",
      why: "Provides behavioral advice for system design interviews at Google, though content is non-technical/psychological.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://www.glassdoor.co.in/Interview/Google-Software-Engineer-Interview-Questions-EI_IE9079.0,6_KO7,24.htm",
      title: "Google Software Engineer Interview Questions",
      why: "General aggregator page for Software Engineer interviews; no usable content.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://www.youtube.com/watch?v=Og8pN3QPX10",
      title:
        "Inside Google's Hiring Process: Interview with Google's Engineering Lead: Culture, & Career Tips",
      why: "Podcast featuring a Google Engineering Lead discussing general hiring philosophy and career development at Google; useful context but not specific interview questions.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://interviewkickstart.com/blogs/interview-questions/full-stack-system-design-interview-questions",
      title: "How to Crack Full Stack System Design Interview Questions?",
      why: "Sample interview dialogue providing insight into the flow and expectations of a design round.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://www.glassdoor.com/Interview/Google-Software-Engineer-Interview-Questions-EI_IE9079.0,6_KO7,24.htm",
      title: "Google Software Engineer Interview Experience & Questions",
      why: "Aggregator of interview questions for Google, not specific enough to the Bengaluru office to be tiered higher.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://www.glassdoor.com/Interview/Google-early-career-software-engineer-Interview-Questions-EI_IE9079.0,6_KO7,37.htm",
      title: "Google early career software engineer interview questions",
      why: "General aggregation for early-career roles; lacks specific content.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://leetcode.com/discuss/post/6469509/google-latest-interview-experiences-coll-r4zm",
      title: "Google latest Interview Experiences : Collection - Curated and organised",
      why: "Aggregator of various interview experiences; mentions Google India and Bangalore specific roles, but is not a single coherent first-hand account.",
      kind: "interview_experience",
      access: "search_preview",
    },
    {
      url: "https://newsletter.pragmaticengineer.com/p/google",
      title: "Inside Google's Engineering Culture: Part 1",
      why: "Engineering culture overview of Google; general career preparation but lacks specific interview evidence.",
      kind: "company_engineering",
      access: "search_preview",
    },
    {
      url: "https://www.google.com/about/careers/applications/how-we-hire",
      title: "Our hiring process - Google Careers",
      why: "Official company careers page outlining general hiring process.",
      kind: "company_docs",
      access: "search_preview",
    },
    {
      url: "https://www.interviewbit.com/system-design-interview-questions",
      title: "Top System Design Interview Questions (2025) - InterviewBit",
      why: "Provides general system design preparation material useful for any big tech interview, but not specific to Google.",
      kind: "discussion",
      access: "search_preview",
    },
    {
      url: "https://www.quora.com/Can-anyone-share-his-her-Google-Bangalore-interview-experience",
      title: "Can anyone share his/her Google Bangalore interview experience?",
      why: "Query-only page, no interview content.",
      kind: "discussion",
      access: "search_preview",
    },
    {
      url: "https://www.linkedin.com/posts/goyalshalini_if-i-had-a-system-design-interview-tomorrow-activity-7298690405141827586-K2AM",
      title:
        "How to pass a system design interview at Google | Shalini Goyal posted on the topic | LinkedIn",
      why: "Offers practical advice and expectations for system design interviews, explicitly referencing Google's focus on design documentation and requirements.",
      kind: "discussion",
      access: "search_preview",
    },
    {
      url: "https://www.youtube.com/watch?v=FLtmxTOT6LQ",
      title: "Google Complete Interview Process + How to Prep for the Interview | SWE ...",
      why: "Instructional video regarding the general Google interview process.",
      kind: "video",
      access: "search_preview",
    },
    {
      url: "https://igotanoffer.com/blogs/tech/google-system-design-interview",
      title: "Google System Design Interviews (questions, process, prep)",
      why: "System design preparation guide for Google, includes level-specific expectations.",
      kind: "other",
      access: "search_preview",
    },
    {
      url: "https://prachub.com/companies/google/categories/system-design",
      title: "Google System Design Questions (Updated 2026) | PracHub",
      why: "System design preparation resource specific to Google.",
      kind: "other",
      access: "search_preview",
    },
    {
      url: "https://interviewkickstart.com/blogs/interview-questions/google-system-design-interview-questions",
      title: "25+ Google System Design Interview Questions for Software Developers",
      why: "System design preparation resource specific to Google.",
      kind: "other",
      access: "search_preview",
    },
    {
      url: "https://www.youtube.com/watch?v=o-k7h2G3Gco",
      title: "How to Crack Any System Design Interview",
      why: "General interview strategy for system design, applicable to Google.",
      kind: "other",
      access: "search_preview",
    },
    {
      url: "https://www.preplaced.in/blog/google-software-engineer-interview-preparation-guide-for-swe-ii-and-swe-iii-roles",
      title: "Google Software Engineer Interview Process | Pr… | Preplaced",
      why: "General career advice and description of the Google interview process rather than a specific account.",
      kind: "other",
      access: "search_preview",
    },
    {
      url: "https://medium.com/swlh/my-preparation-journey-for-google-interviews-f41e2dc3cdf9",
      title: "My Preparation Journey for Google Interviews",
      why: "This is a general guide on how to prepare for software engineering interviews at tech giants like Google, covering DSA and system design study strategies.",
      kind: "other",
      access: "full_text",
    },
    {
      url: "https://www.linkedin.com/posts/anu-sharma-2002_google-systemdesign-collab-activity-7310161869892108289-o1zG",
      title: "How to prepare for system design interviews at Google",
      why: "General advice and tips for Google system design interviews; not an interview experience account, but highly relevant for preparation.",
      kind: "other",
      access: "full_text",
    },
    {
      url: "https://www.tryexponent.com/blog/system-design-interview-guide",
      title: "System Design Interview Prep & Questions (2026 Guide)",
      why: "General system design preparation guide.",
      kind: "other",
      access: "search_preview",
    },
    {
      url: "https://www.glassdoor.com/Reviews/Google-Bangalore-Reviews-EI_IE9079.0,6_IL.7,16_IM1091.htm",
      title: "Google Reviews in Bangalore",
      why: "General employee review page; not relevant to interview preparation.",
      kind: "other",
      access: "search_preview",
    },
    {
      url: "https://www.tryexponent.com/guides/google-software-engineer-interview",
      title: "Google Software Engineer (SWE) Interview Guide",
      why: "Useful guide on Google's standard interview loop structure, though not specific to the Bengaluru office.",
      kind: "other",
      access: "search_preview",
    },
  ] satisfies SampleResource[],
};
