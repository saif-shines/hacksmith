---
title: What is hacksmith?
sidebar:
  label: What is _hacksmith?
---

Hacksmith is a CLI that helps engineering teams to both onboard and implement a new product or service into their existing projects. Engineers switch between study and work modes in seconds.

**Users** would run a command like `hacksmith plan --b ./my-blueprint.toml -e` to trigger a CLI flow that guides them through the process of onboarding and implementing a new product or service into their existing projects.

**Quicksmiths** are the people who author the blueprints that guide the users through the process of onboarding and implementing a new or existing product or service into their existing projects.

#### Watch: Hacksmith in 60 seconds

<video controls preload="metadata" playsinline style="width: 100%; height: auto; border-radius: 8px;">
  <source src="/vids/hacksmith-in-60s.mp4" type="video/mp4" />
  Your browser does not support the video tag. You can
  <a href="/vids/hacksmith-in-60s.mp4">download the video here</a>.
</video>

#### Use cases

1. A developer who is tasked to integrate stripe payments into their product, would simply run `npx hacksmith /path/to/integrate-stripe.toml`. The CLI will take the user through sign up for an account, login, get credentials, curate the prompt and trigger an AI agent that will work the project to start integrating payments.
2. A new engineer who joined the team would run `npx hacksmith your-repo/onboarding.toml` to start getting access various tools and services that they would need to start working on the project.

#### How does hacksmith work?

```d2
direction: right

Users -> Terminal: "npx hacksmith"
Terminal -> Hacksmith
Quicksmiths -> Blueprints: "Publish"
Blueprints -> Hacksmith: "Reads and executes"
Hacksmith -> "successfully guided": Users
```
