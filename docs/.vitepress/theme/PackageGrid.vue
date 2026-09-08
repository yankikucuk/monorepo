<script setup lang="ts">
import { withBase } from 'vitepress';

import packages from '../generated/packages.json';

/** Splits a description on backticks so `code` spans render as code. */
const segments = (text: string): { code: boolean; text: string }[] =>
  text.split('`').map((part, index) => ({ code: index % 2 === 1, text: part }));
</script>

<template>
  <section class="package-grid">
    <a v-for="pkg in packages" :key="pkg.name" class="package-card" :href="withBase(`/packages/${pkg.slug}/`)">
      <header>
        <span class="package-name">{{ pkg.name }}</span>
        <span class="package-version">v{{ pkg.version }}</span>
      </header>
      <p class="package-description">
        <template v-for="(part, index) in segments(pkg.description)" :key="index">
          <code v-if="part.code">{{ part.text }}</code>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>
      <footer>
        <span class="package-kind">{{ pkg.kind === 'product' ? 'Library' : 'Shared config' }}</span>
        <span v-if="pkg.hasApi" class="package-tag">API</span>
        <span v-if="pkg.hasChangelog" class="package-tag">Changelog</span>
      </footer>
    </a>
  </section>
</template>
