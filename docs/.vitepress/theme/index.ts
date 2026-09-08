import DefaultTheme from 'vitepress/theme';

import PackageGrid from './PackageGrid.vue';

import type { Theme } from 'vitepress';

import './style.css';

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('PackageGrid', PackageGrid);
  },
};

export default theme;
