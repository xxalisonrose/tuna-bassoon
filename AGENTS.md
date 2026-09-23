# Expo Has Changed

Read the exact versioned documentation at https://docs.expo.dev/versions/v57.0.0/ before writing Expo code.

# Secrets and Credentials

Never open, inspect, print, echo, search, copy, or expose the contents of `.env` files, credential files, keychains, tokens, API keys, or secret environment variables.

Do not run commands such as `env`, `printenv`, or other commands that could display credential values. Do not include credentials in prompts, tool output, logs, documentation, screenshots, or commits.

Existing credentials may be used indirectly by the application and its configured tools, but their values must never be loaded into the agent session.

Refer only to environment-variable names. Use `.env.example` with blank or clearly fake placeholders when documenting required configuration.

If a credential is missing or must be changed, ask the user to configure it through the appropriate provider or interactive CLI. Never ask the user to paste a secret into chat.

Never commit `.env` files, credentials, tokens, private keys, or other secret material.

# Git and Project Artifacts

Treat project documentation, implementation plans, architecture notes, and agent rules as source-controlled project artifacts.

Include intentional changes to documentation and rules in the appropriate Git commit after they have been reviewed.

Before editing, check the working tree and preserve unrelated user changes. Do not overwrite or remove work that is outside the current task.

Commit generated files only when they are an expected part of this repository. Convex generated type files are expected when their underlying API changes.

Do not commit temporary files, local caches, development logs, screenshots, or machine-specific configuration.

# User-Facing Writing

Write user-facing copy and project documentation in direct, natural language that matches the voices of Dan and Ali.

Revise AI-assisted writing before treating it as final. Remove canned introductions, generic conclusions, inflated claims, filler, marketing language, repetitive summaries, and unnecessary restatement.

Avoid excessive headings, em dashes, rhetorical questions, buzzwords, and phrases such as “delve,” “leverage,” “robust,” or “seamless” when simpler language is clearer.

Use concrete details, varied sentence lengths, and plain language. Do not mention AI involvement unless it is relevant to the document.

The goal is clear, credible writing that sounds like a person familiar with the project—not writing designed to trick automated detection tools.