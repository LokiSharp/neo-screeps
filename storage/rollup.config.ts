import typescript from "@rollup/plugin-typescript";
import { dts } from "rollup-plugin-dts";
import alias from '@rollup/plugin-alias';
import * as path from "path";
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const config = [
  {
    input: 'src/index.ts',
    output: [
      {
        file: './dist/index.js',
        format: 'cjs',
        sourcemap: true,
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
    input: "src/index.ts",
    output: [{ file: "./dist/index.d.ts", format: "es" }],
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