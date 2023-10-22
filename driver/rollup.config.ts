import typescript from "@rollup/plugin-typescript";
import { dts } from "rollup-plugin-dts";
import alias from '@rollup/plugin-alias';
import * as path from "path";
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const config = [
  {
    input: {
      runtime: './src/runtime/runtime-driver.ts'
    },
    output: [
      {
        dir: 'dist',
        format: 'cjs',
        entryFileNames: '[name].js',
      }
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json'
      }),
      resolve(),
      commonjs(),
      alias({
        entries: [
          { find: '@', replacement: path.join(path.resolve(), "src") }
        ]
      }),
    ]
  },
  {
    input: {
      runtime: './src/runtime/runtime-driver.ts'
    },
    output: [
      {
        dir: 'dist',
        format: 'es',
        entryFileNames: '[name].d.ts',
      }
    ],
    plugins: [
      dts(),
      alias({
        entries: [
          { find: '@', replacement: path.join(path.resolve(), "src") }
        ]
      }),
      resolve(),
      commonjs()
    ]
  }
]
export default config;