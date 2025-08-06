import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],

    // 开发服务器配置
    server: {
        port: 3000,
        host: true,
        open: true
    },

    // 构建优化配置
    build: {
        outDir: 'build',
        sourcemap: false, // 禁用 source map 提升构建速度
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true, // 生产环境移除 console
                drop_debugger: true,
            },
        },
        rollupOptions: {
            output: {
                // 手动代码分割
                manualChunks: {
                    // React 核心
                    'react-vendor': ['react', 'react-dom'],
                    // 3D 图形库
                    'three-vendor': ['three'],
                    // 物理引擎
                    'cannon-vendor': ['cannon-es'],
                    // 图标库
                    'lucide-vendor': ['lucide-react'],
                },
            },
        },
        // 构建性能优化
        chunkSizeWarningLimit: 1000, // 1MB 警告阈值
        reportCompressedSize: false, // 禁用压缩大小报告以提升构建速度
    },

    // 路径解析
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@components': resolve(__dirname, 'src/components'),
            '@utils': resolve(__dirname, 'src/utils'),
            '@hooks': resolve(__dirname, 'src/hooks'),
        }
    },

    // 优化依赖预构建
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'three',
            'cannon-es',
            'lucide-react'
        ],
        exclude: []
    },

    // CSS 配置
    css: {
        postcss: './postcss.config.js'
    },

    // 环境变量前缀
    envPrefix: 'REACT_APP_',

    // 预览服务器配置
    preview: {
        port: 3000,
        host: true
    }
})