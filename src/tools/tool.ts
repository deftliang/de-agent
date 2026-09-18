import { z } from 'zod';

export type PermissionLevel = 'allow' | 'ask' | 'deny';

export interface ToolDef<T extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  inputSchema: T;
  permissionLevel?: PermissionLevel;
  isReadOnly?: boolean;
  execute(args: z.infer<T>): Promise<string>;
  validateInput?(args: unknown): { valid: boolean; error?: string };
}

export interface Tool extends ToolDef {
  permissionLevel: PermissionLevel;
  isReadOnly: boolean;
  getOpenAISchema(): object;
}

function zodToJsonSchema(schema: z.ZodTypeAny): any {
  if (schema instanceof z.ZodString) {
    return { type: 'string' };
  } else if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  } else if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  } else if (schema instanceof z.ZodEnum) {
    return { type: 'string', enum: schema.options };
  } else if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const key in shape) {
      let propSchema = shape[key];
      let isOptional = false;
      
      if (propSchema instanceof z.ZodOptional) {
        isOptional = true;
        propSchema = propSchema.unwrap();
      } else if (propSchema instanceof z.ZodDefault) {
        isOptional = true;
        propSchema = propSchema._def.innerType;
      }
      
      properties[key] = zodToJsonSchema(propSchema);
      
      if (!isOptional) {
        required.push(key);
      }
    }
    return { type: 'object', properties, required };
  } else if (schema instanceof z.ZodArray) {
    return { type: 'array', items: zodToJsonSchema(schema.element) };
  } else if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema.unwrap());
  } else if (schema instanceof z.ZodDefault) {
    return zodToJsonSchema(schema._def.innerType);
  }
  
  return { type: 'string' };
}

export function buildTool<T extends z.ZodType>(def: ToolDef<T>): Tool {
  return {
    ...def,
    permissionLevel: def.permissionLevel ?? 'ask',
    isReadOnly: def.isReadOnly ?? false,
    validateInput(args: unknown) {
      if (def.validateInput) {
        return def.validateInput(args);
      }
      const parsed = def.inputSchema.safeParse(args);
      if (parsed.success) {
        return { valid: true };
      }
      return { valid: false, error: parsed.error.message };
    },
    getOpenAISchema() {
      return {
        type: 'function',
        function: {
          name: this.name,
          description: this.description,
          parameters: zodToJsonSchema(this.inputSchema)
        }
      };
    }
  };
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    let tool = this.tools.get(name);
    if (!tool) {
      // Fallback: try case-insensitive or exact mapping
      const lowerName = name.toLowerCase();
      for (const t of this.tools.values()) {
        if (t.name.toLowerCase() === lowerName || 
            t.name.toLowerCase() === lowerName.replace(/tool$/, '')) {
          return t;
        }
      }
    }
    return tool;
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  getAllSchemas(): object[] {
    return this.getAll().map(t => t.getOpenAISchema());
  }
}
