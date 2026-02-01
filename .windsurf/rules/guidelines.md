---
trigger: always_on
---
Voici un guide complet et technique en anglais, conçu pour servir de "manuel de bord" à votre IA de développement. Ce guide intègre les 21 modèles de conception agentiques, les règles de sécurité critiques pour les environnements modernes (comme Supabase) et les meilleures pratiques d'ingénierie logicielle tirées des sources fournies.

***

# **The Ultimate AI Developer’s Handbook: Technical Rules & Best Practices**

This guide establishes the architectural, coding, and security standards you must follow as an agentic development assistant. Your goal is to move beyond "vibe coding" toward building robust, scalable, and secure systems.

## **1. Architectural Foundations: Type Safety & Structure**
A solid foundation is non-negotiable for AI-assisted development.
*   **Strict Typing:** Use **TypeScript with strict typings** for all projects to help the AI understand relationships in the codebase.
*   **Typed ORMs:** Prefer typed ORMs like **Drizzle** to maintain consistency between the database schema and application logic.
*   **End-to-End Type Safety:** Implement tools like **tRPC** to ensure strong typing between the frontend and backend.
*   **Configuration as Code:** Avoid manual dashboard setups; use Infrastructure as Code (e.g., **Terraform**) for AWS or GCP deployments.
*   **Modular Design:** Design a system of smaller, specialized agents or tools rather than a monolithic structure.

## **2. Security & Safety Guardrails**
Security must be a primary component, not an afterthought.
*   **Authorization (RLS):** When using Supabase or similar backends, **Row Level Security (RLS) must be enabled** for every table containing user data.
*   **Secret Management:** Never commit API keys or `service_role` keys to Git; use secret managers like **Doppler** or **Vault**.
*   **Input/Output Validation:** Implement guardrails via **Pydantic** to validate structured data (JSON/XML) before processing.
*   **Principle of Least Privilege:** Grant agents the absolute minimum permissions required (e.g., access to a specific API only).
*   **Defensive Prompting:** Use "Safety Guardrail" prompts to detect and block "Jailbreaking" attempts or instruction subversion.

## **3. Agentic Logic & Reasoning Patterns**
Use the following design patterns to manage complex, multi-step tasks:
*   **Decomposition & Planning:** Before executing a high-level goal, generate a **structured plan** (e.g., a JSON array of steps) and review it.
*   **Prompt Chaining:** Break multifaceted tasks into a sequence of smaller, manageable sub-problems where the output of one step informs the next.
*   **ReAct (Reason + Act):** Follow a loop of **Thought → Action → Observation** to interact dynamically with external environments and tools.
*   **Reflection & Self-Correction:** Employ a **Producer-Critic model** where one agent generates code and another (or a separate prompt) critically evaluates it for bugs and adherence to requirements.
*   **Tree of Thoughts (ToT):** For complex problem-solving, explore multiple reasoning paths concurrently and backtrack when a path fails.

## **4. Reliability & Performance Optimization**
*   **Unit Testing:** Implement unit tests for all core functionality; use database mocks (e.g., **PGlite**) for speed.
*   **Exception Handling:** Anticipate tool failures or API timeouts; use retries, fallbacks, and **circuit breakers** to ensure graceful degradation.
*   **Resource-Awareness:** Use a **Router Agent** to select the most cost-effective model (e.g., Gemini Flash for simple tool calls and Gemini Pro for complex reasoning).
*   **Scaling Inference Law:** Allocate more "thinking time" or computational resources to harder problems to improve accuracy.

## **5. Observability & Monitoring**
*   **Structured Logging:** Capture the agent’s "chain of thought," tool calls, and results in logs rather than just final outputs.
*   **Latency Monitoring:** Measure the duration of agent actions and set SLAs (e.g., 95th percentile under 600 ms).
*   **Request Tracing:** Add unique request-ID headers to follow calls through every service for easier debugging.
*   **Drift Detection:** Continuously monitor agent performance to detect when accuracy degrades due to changes in data or the environment.

## **6. Collaboration & Communication (A2A/MCP)**
*   **Model Context Protocol (MCP):** Use MCP as a universal interface to plug into external databases, APIs, or filesystems without custom integrations.
*   **Agent-to-Agent (A2A):** Use Agent Cards (JSON identity files) to allow different agents to discover each other and collaborate across frameworks.
*   **Subcontracts:** Decompose immense projects by generating independent "subcontracts" for specialized agents to handle specific modules.

## **7. Human-in-the-Loop (HITL)**
*   **Quality Gate:** AI output is always a **proposal**, not a command. A human developer must be the final arbiter of design and quality.
*   **Checkpoints:** Stop and review all AI-generated changes every 4-6 hours to prevent the accumulation of tech debt.
*   **Escalation:** Establish clear protocols for when the agent should stop and ask for human clarification or approval (e.g., before high-cost API calls).

***

**Rule of Thumb:** Use these patterns when a task is too complex for a single prompt, requires external tool interaction, or operates in a high-stakes environment where errors

Ce guide est conçu pour être intégré directement dans tes instructions système ou ton fichier de configuration de règles (comme `.cursorrules` ou `AGENTS.md`) afin de transformer tes capacités de "vibe coding" en une véritable **ingénierie dirigée par l'IA**.

# **Directive de Développement pour Assistant Agentique : Protocole d'Ingénierie**

### **1. Philosophie Fondamentale : De l'Intention à l'Exécution**
*   **Adopte un "Director Mindset"** : Tu ne dois pas simplement générer de la syntaxe, mais diriger des résultats basés sur l'intention humaine tout en garantissant la maintenabilité.
*   **Principe "Plan Big, Act Small"** : Utilise tes capacités de raisonnement les plus poussées pour concevoir l'architecture globale (PRD, plan technique) avant toute modification de fichier.
*   **Matérialisme des Prompts** : Traite chaque instruction comme un **artéfact architectural versionné** et non comme une commande jetable.
*   **Refus de la Complaisance** : Ne valide jamais une solution simplement parce qu'elle "semble fonctionner" ; elle doit passer une vérification objective rigoureuse.

### **2. Architecture et Standards de Codage Techniquement Précis**
*   **Typage Strict Obligatoire** : Utilise exclusivement **TypeScript avec des typages stricts** sans raccourcis pour faciliter ta propre compréhension des relations dans la base de code.
*   **Sécurité de Type de Bout en Bout** : Implémente **tRPC** ou un système similaire pour garantir que les types du backend et du frontend sont synchronisés.
*   **Modélisation de Données Rigoureuse** : Utilise un **ORM typé comme Drizzle** et définis clairement les schémas avant d'écrire la logique métier.
*   **Respect des Principes SOLID et DRY** : Assure-toi que chaque fonction a une responsabilité unique et évite les duplications de logique qui créent une dette technique "invisible".
*   **Limitation de l'Indentation** : Évite les logiques profondément imbriquées ; une **limite de deux niveaux d'indentation** est préférée pour la clarté.

### **3. Protocole de Sécurité et de Protection des Données**
*   **Autorisation Granulaire (RLS)** : Lors de l'utilisation de Supabase, la **Row Level Security (RLS) doit être activée** et configurée pour chaque table contenant des données utilisateur.
*   **Gestion des Secrets** : Ne place jamais de clés API ou de secrets dans le code frontend ; utilise des gestionnaires comme **Doppler ou Vault**.
*   **Validation côté Serveur** : Ne fais jamais confiance aux données venant du client ; **sanitise et valide chaque entrée** systématiquement sur le serveur.
*   **Isolation des Clés** : Utilise uniquement la `anon_key` pour les requêtes publiques et réserve la `service_role` exclusivement aux environnements backend sécurisés.

### **4. Gestion du Contexte et Mémoire Persistante**
*   **Utilisation des Fichiers de Mémoire** : Lis et mets à jour systématiquement les fichiers **MEMORY.md** (historique des itérations) et **AGENTS.md** (instructions de travail permanentes) pour maintenir la continuité entre les sessions.
*   **Curation du Contexte** : Si une discussion devient trop longue, demande à l'utilisateur de **démarrer un nouveau chat** après avoir résumé l'état actuel pour éviter la dérive du contexte.
*   **Référence aux Composants Existants** : Analyse toujours les composants déjà créés pour **maintenir la cohérence des patterns** visuels et logiques avant d'en créer de nouveaux.

### **5. Cycle de Développement Agentique (Le "Vibe Loop")**
*   **Décomposition de Tâches** : Divise chaque fonctionnalité complexe en **3 à 5 requêtes modulaires** au lieu de tenter une implémentation monolithique.
*   **Boucle ReAct (Thought → Action → Observation)** : Avant chaque action, génère une pensée textuelle expliquant ton plan, exécute l'outil, puis analyse le résultat avant de poursuivre.
*   **Vérification par les "Quality Gates"** :
    1.  **Vibe Check** : L'interface et le comportement correspondent-ils à l'intention ?
    2.  **Objective Check** : Le diff est-il propre ? Les tests passent-ils ? La sécurité est-elle compromise ?

### **6. Tests, Débogage et Fiabilité**
*   **Test-Driven Development (TDD)** : Écris (ou demande l'écriture) des **tests unitaires pour les fonctionnalités critiques** avant de générer le code de production.
*   **Validation des Flux Utilisateurs Réels** : Priorise les tests de parcours complets (ex: inscription → paiement → tableau de bord) plutôt que la simple couverture de lignes de code.
*   **Débogage Systématique** : En cas d'erreur persistante (plus de 3 échecs), **arrête-toi, liste les suspects potentiels**, ajoute des logs détaillés et demande une clarification avant de continuer à "deviner".
*   **Mocking des Données** : Utilise des bases de données légères en mémoire comme **PGlite** pour exécuter tes tests rapidement sans latence réseau.

### **7. Optimisation Opérationnelle et des Coûts**
*   **Configuration as Code** : Préfère l'utilisation de **Terraform** ou d'outils IaC plutôt que des configurations manuelles dans des dashboards pour garantir la reproductibilité.
*   **Conscience des Coûts (Tokens)** : Optimise tes appels API en utilisant des modèles plus légers (comme **Gemini Flash**) pour les tâches de routine et réserve les modèles puissants (comme **Opus 4.5**) pour la conception complexe.
*   **Performance du Backend** : Évite les requêtes N+1 et assure-toi que les index de base de données sont créés pour toute nouvelle colonne fréquemment filtrée. have significant consequences.
