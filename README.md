# 🌧️ RoadRisk Delhi
### Flood What-If & Cascade Engine for Resilient Roads and Hospital Access

**RoadRisk Delhi** is an urban flood-impact simulation and decision-support prototype designed to help city planners understand how waterlogging and road closures can trigger cascading traffic congestion and disrupt access to hospitals.

Developed by **Team Optimal Run for Kritical Hacks 2026**, the project combines road-network simulation, interactive mapping, budget-based optimization, and TinyFish-powered live web search to support more informed flood-resilience planning.

---

## 🎯 Problem Statement

During heavy rainfall, flooding at critical underpasses and road sections can disrupt traffic across an entire network. When one road becomes inaccessible, vehicles reroute to nearby roads, potentially causing additional congestion and affecting emergency access.

Traditional flood maps show where water may accumulate, but planners also need to understand:

- Which nearby roads may become overloaded?
- How could road closures affect travel times?
- Could access to hospitals and emergency care be disrupted?
- Which mitigation measures should be prioritized within a limited budget?
- How can recent waterlogging reports be incorporated into scenario planning?

RoadRisk Delhi aims to explore these questions through scenario-based simulation and decision support.

## 💡 Our Solution

RoadRisk Delhi allows users to simulate flood-related road closures, analyze their potential network-wide consequences, and compare possible infrastructure fixes.

### ✨ Key Features

- **Flood Scenario Simulation:** Explore hypothetical flooding and road-closure scenarios.
- **Traffic Cascade Analysis:** Identify roads that may exceed capacity as traffic reroutes.
- **Hospital Accessibility Analysis:** Examine potential changes in routes and access to trauma-care facilities.
- **Budget-Based Fix Optimizer:** Compare candidate mitigation measures within a specified budget.
- **TinyFish-Powered Live Monsoon Feed:** Search for recent waterlogging reports and advisories relevant to Delhi.
- **Incident Classification:** Organize search results by recency, event type, and geographic relevance.
- **Replay Mode:** Explore documented past events through the prototype's replay workflow.
- **Interactive Map Dashboard:** Visualize affected locations, road networks, and simulation outputs.

---

## 🐟 TinyFish Integration — Live Web Intelligence

### What is TinyFish?

**TinyFish is used in RoadRisk Delhi as a web-search and information-ingestion component.** It helps the prototype discover relevant online information about waterlogging and monsoon-related incidents, providing a way to incorporate changing real-world reports into flood-scenario planning.

Static hotspot lists can become outdated. Searching for recent reports can help the prototype explore incidents that may not appear in a fixed list.

### Why TinyFish?

During the monsoon, information about flooded underpasses, traffic disruptions, and road closures may appear in online reports and advisories.

TinyFish Search helps RoadRisk Delhi surface potentially relevant information so the prototype can distinguish recent incident reports from less relevant results and use qualifying information in its scenario workflow.

### How TinyFish Works in RoadRisk Delhi

1. **Search for relevant reports:** The prototype uses TinyFish Search to retrieve online results related to Delhi waterlogging and monsoon incidents.
2. **Inspect the results:** Search results are displayed with their dates, labels, and explanations of why they are or are not used.
3. **Classify candidate incidents:** Results are assessed using recency, event type, and geographic-zone matching rules.
4. **Filter relevant information:** Only results that meet the prototype's classification criteria are treated as qualifying flood incidents.
5. **Connect to scenario analysis:** Qualifying incidents can inform the flood-hotspot workflow, allowing the cascade and hospital-access analysis to be rerun.
6. **Support replay and review:** A replay mode allows exploration of documented past events when suitable recent reports are unavailable.

### TinyFish Integration Workflow

```text
TinyFish Search
      ↓
Find Delhi Waterlogging Reports
      ↓
Review Dates and Search Results
      ↓
Rule-Based Incident Classification
      ↓
Filter Relevant Flood Incidents
      ↓
Flood Scenario / Hotspot Workflow
      ↓
Traffic Cascade Analysis
      ↓
Hospital Accessibility Analysis
```

### Current Implementation and Limitations

The current prototype calls TinyFish Search for Delhi waterlogging reports and presents search results with dates and classification explanations. It also supports a cached snapshot and a replay mode for past events.

The current classification is **rule-based, not a trained machine-learning model**. The prototype's planned extensions include using TinyFish Fetch to read full advisory pages and a Web Agent to extract road-closure information from traffic-police sources.

A search result is not automatically treated as verified ground truth. Results may be incomplete, outdated, or geographically ambiguous, so incident validation remains important.

---

## ⚙️ How the Simulation Works

1. **Input:** Use road-network data, hospital locations, flood hotspots, and traffic-demand assumptions.
2. **Create a scenario:** Select a flood hotspot or road closure and configure the scenario.
3. **Simulate traffic:** Model rerouting and congestion across the affected road network.
4. **Analyze cascading effects:** Identify nearby roads that may exceed their capacity.
5. **Assess hospital access:** Examine potential travel-time changes and routes to trauma-care facilities.
6. **Optimize fixes:** Compare candidate mitigation measures against the available budget.
7. **Review results:** Use the map and dashboard to understand potential impacts and compare scenarios.

## 🧠 AI/ML and Technical Approach

The prototype combines graph-based traffic simulation, routing, and optimization to support flood-resilience planning.

- **Synthetic travel demand:** Represents trips between zones for scenario analysis.
- **Shortest-path routing:** Models alternative routes when roads become unavailable.
- **BPR congestion model:** Represents how traffic conditions change as road utilization increases.
- **Cascade analysis:** Examines downstream effects of road closures on nearby roads.
- **Combinatorial optimization:** Searches for candidate combinations of mitigation measures within a budget.
- **Rule-based incident classification:** Assesses TinyFish Search results by recency, event type, and geographic relevance.

**Scope note:** The prototype does not yet use a trained machine-learning model for traffic-demand prediction. Traffic demand is synthetic, and simulation outputs should be interpreted as illustrative, relative results rather than validated city-wide forecasts.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript |
| Interactive mapping | Leaflet, OpenStreetMap |
| Backend | Node.js, Express |
| Road-network data | OpenStreetMap / Overpass |
| Live web search | TinyFish Search |
| Traffic simulation | Graph-based routing, traffic assignment, BPR congestion |
| Optimization | Budget-constrained mitigation planning |

## 🏙️ Target Users

- **Government and city planners:** MCD, PWD, Delhi Traffic Police, and flood-management teams.
- **Hospitals and ambulance networks:** Potential future integration for emergency-route planning.
- **Residents and commuters:** Potential future access to route-impact information and validated hotspot reporting.

## 📊 Expected Impact

RoadRisk Delhi aims to support:

- Better prioritization of flood-mitigation investments.
- Earlier identification of roads vulnerable to cascading congestion.
- Improved planning for emergency and hospital accessibility.
- Comparison of short-term interventions and longer-term infrastructure improvements.
- Scenario planning informed by potentially relevant live web reports.
- More informed, data-driven urban resilience planning.

Numerical outputs currently shown by the prototype are illustrative and depend on scenario assumptions and available data.

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- Git
- A TinyFish API key or other required credentials if the configured integration requires authentication

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd YOUR_REPOSITORY_FOLDER
```

Replace the placeholders with your actual repository URL and project directory.

### 2. Install Dependencies

```bash
npm install
```

If the frontend and backend use separate directories with their own `package.json` files, install dependencies in the relevant directories.

### 3. Configure Environment Variables

Create a `.env` file in the directory expected by the application. Add the environment variables required by your code.

For example:

```env
PORT=3000
TINYFISH_API_KEY=your_api_key_here
```

Use the actual variable names expected by your implementation. Do not commit API keys, passwords, or other secrets to GitHub.

### 4. Run the Application

Use the scripts defined in your `package.json`. For a typical Node.js development setup, the command may be:

```bash
npm run dev
```

Follow the terminal output for the correct local URL and any additional frontend or backend startup instructions.

## 🎥 Demo Video

Watch the RoadRisk Delhi prototype demonstration:

**Demo Video:** [Paste your YouTube demo URL here]

## 💻 GitHub Repository

**Source Code:** [Paste your GitHub repository URL here]

## 🔮 Future Scope

- Integrate real-time rainfall and weather data.
- Validate flood hotspots against surveyed locations and historical incidents.
- Expand beyond the Central Delhi pilot.
- Improve traffic-demand estimation using real trip data.
- Extend TinyFish integration with Fetch and Web Agent capabilities to extract road-closure information from full advisory pages.
- Improve validation of live reports against official traffic and emergency-management sources.
- Add validated resident reporting.
- Explore hospital and ambulance-system integrations.
- Evaluate simulation outputs against real-world observations.

## 👥 Team Optimal Run

- **Saloni Karn**
- **Tamanna Thakur**
- **Shambhavi Tripathi**
- **Priyanka Sharma**

## 🌍 Our Vision

**Know what breaks next — before the first underpass floods.**

RoadRisk Delhi aims to support safer, more resilient urban mobility by helping decision-makers explore flood scenarios, understand cascading road-network impacts, and prioritize potential mitigation measures.

---

*Developed for Kritical Hacks 2026 | Sustainability · AI/ML · Open Innovation*
