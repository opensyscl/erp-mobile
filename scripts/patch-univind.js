#!/usr/bin/env node
// Stub for `univind` — removed from npm, imported internally by heroui-native.
// Installed in TWO places so Metro finds it regardless of resolution context:
//   1. node_modules/univind/           (top-level, for app-level imports)
//   2. node_modules/heroui-native/node_modules/univind/  (scoped, for heroui-native imports)
const fs = require('fs');
const path = require('path');

const STUB_PKG = JSON.stringify({ name: 'univind', version: '0.0.1-stub', main: 'index.js' });
const STUB_JS = `"use strict";
const { useMemo } = require('react');
const { useColorScheme } = require('react-native');

const Uniwind = { updateInsets: function () {} };

function useUniwind() {
  const scheme = useColorScheme();
  return { theme: scheme != null ? scheme : 'light' };
}

function useResolveClassNames(_c) {
  return useMemo(function () { return {}; }, [_c]);
}

function useCSSVariable(vars) {
  return useMemo(function () { return vars.map(function () { return ''; }); }, [vars]);
}

function withUniwind(C) { return C; }

exports.Uniwind = Uniwind;
exports.useUniwind = useUniwind;
exports.useResolveClassNames = useResolveClassNames;
exports.useCSSVariable = useCSSVariable;
exports.withUniwind = withUniwind;
`;

const targets = [
  path.join(__dirname, '..', 'node_modules', 'univind'),
  path.join(__dirname, '..', 'node_modules', 'heroui-native', 'node_modules', 'univind'),
];

for (const dir of targets) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), STUB_PKG);
  fs.writeFileSync(path.join(dir, 'index.js'), STUB_JS);
}

console.log('✓ univind stub patched en', targets.length, 'ubicaciones');
