#!/usr/bin/env node
// Creates a stub for `univind`, which heroui-native imports internally
// but was removed from npm. Runs automatically after `npm install`.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'node_modules', 'univind');
fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(
  path.join(dir, 'package.json'),
  JSON.stringify({ name: 'univind', version: '0.0.1-stub', main: 'index.js' }, null, 2)
);

fs.writeFileSync(
  path.join(dir, 'index.js'),
  `"use strict";
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
`
);

console.log('✓ univind stub patched');
