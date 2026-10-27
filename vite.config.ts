import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const apiOrigin = (env.VITE_BASE_URL ?? '').replace(/\/api\/?$/, '');

    return {
    plugins: [
        react(),
        {
            name: 'covera-preload-error-reload',
            transformIndexHtml() {
                return [
                    ...(apiOrigin
                        ? [
                              {
                                  tag: 'link',
                                  attrs: {
                                      rel: 'preconnect',
                                      href: apiOrigin,
                                  },
                                  injectTo: 'head' as const,
                              },
                          ]
                        : []),
                    {
                        tag: 'script',
                        injectTo: 'head',
                        children: [
                            "window.addEventListener('vite:preloadError', function (event) {",
                            "  event.preventDefault();",
                            "  try {",
                            "    if (sessionStorage.getItem('covera:chunk-reload') === '1') return;",
                            "    sessionStorage.setItem('covera:chunk-reload', '1');",
                            "    window.location.reload();",
                            "  } catch (error) { /* storage unavailable: do not reload */ }",
                            "});",
                        ].join('\n'),
                    },
                ];
            },
        },
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom'],
                    'vendor-router': ['react-router'],
                    'vendor-query': ['@tanstack/react-query'],
                    'vendor-i18n': ['i18next', 'react-i18next', 'i18next-http-backend'],
                    'vendor-supabase': ['@supabase/supabase-js'],
                },
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    };
})
