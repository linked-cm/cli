import {LinkedConfig} from './interfaces';

/**
 * Define a Linked configuration with type checking and autocomplete
 * @param config The configuration object
 * @returns The same configuration object (identity function for type inference)
 */
export function defineConfig(config: LinkedConfig): LinkedConfig {
  return config;
}

