export interface ProjectConfig {
  name: string;
  description: string;
  domain: string;
  instructions: string[];
  fields: {
    [key: string]: string;
  };
  output_format: {
    type: string;
    example: {
      [key: string]: any;
    };
  };
  example_analysis: Array<{
    name: string;
    input: string;
    output: {
      [key: string]: any;
    };
  }>;
}

export interface ProjectResponse {
  _id: string;
  title: string;
  config: ProjectConfig;
  devices: any[];
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

