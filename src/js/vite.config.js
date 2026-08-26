import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    minify: false,
    lib: {
      entry: './src/index.ts',
      // MUST be CommonJS. Deephaven's PluginUtils loads plugin bundles by
      // evaluating the code with `new Function(module, exports, require, ...)`,
      // which is a CJS context — a top-level ESM `import` statement throws
      // "SyntaxError: Cannot use import statement outside a module" there.
      formats: ['cjs'],
      // Keep the main entry as index.js so package.json "main" still resolves.
      fileName: () => 'index.js',
    },
    rollupOptions: {
      // Everything this bundle imports is host-provided, so all of it is
      // external and resolved through Deephaven's require shim at load time.
      // @deephaven/components MUST be external: the toast fallback calls
      // ToastQueue, a module-level singleton the app's ToastContainer renders
      // from. A bundled copy would be a second, unrendered queue.
      external: [
        'react',
        'react-dom',
        '@deephaven/components',
        '@deephaven/log',
        '@deephaven/plugin',
      ],
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  define:
    mode === 'production' ? { 'process.env.NODE_ENV': '"production"' } : {},
}));
