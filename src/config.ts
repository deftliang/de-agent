import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

export interface AgentConfig {
  apiKey: string;
  baseUrl: string;
  modelName: string;
  maxTokens: number;
  temperature: number;
  maxContextTokens: number;
  permissionMode: 'auto' | 'ask';
  maxIterations: number;
}

export async function loadConfig(): Promise<AgentConfig> {
  const config: AgentConfig = {
    apiKey: process.env.DE_AGENT_API_KEY || '',
    baseUrl: process.env.DE_AGENT_BASE_URL || 'https://api.openai.com/v1',
    modelName: process.env.DE_AGENT_MODEL_NAME || 'gpt-4o',
    maxTokens: parseInt(process.env.DE_AGENT_MAX_TOKENS || '4096', 10),
    temperature: parseFloat(process.env.DE_AGENT_TEMPERATURE || '0.0'),
    maxContextTokens: parseInt(process.env.DE_AGENT_MAX_CONTEXT_TOKENS || '128000', 10),
    permissionMode: (process.env.DE_AGENT_PERMISSION_MODE as 'auto' | 'ask') || 'auto',
    maxIterations: parseInt(process.env.DE_AGENT_MAX_ITERATIONS || '50', 10)
  };

  const configPath = path.join(os.homedir(), '.de-agent', 'config.json');
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(data);
    Object.assign(config, parsed);
  } catch (err) {
    // Ignore if config file does not exist
  }

  return config;
}
