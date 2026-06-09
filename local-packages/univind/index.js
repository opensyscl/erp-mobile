"use strict";
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
