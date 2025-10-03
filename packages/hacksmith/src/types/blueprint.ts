export interface AuthConfig {
  has_account_check?: boolean;
  account_detection_method?: string;
  login_url?: string;
  signup_url?: string;
  callback_port?: number;
  callback_path?: string;
}

export interface PreviewConfig {
  enabled?: boolean;
  title?: string;
  description?: string;
  estimated_time?: string;
  steps?: string[];
}

export interface VariableConfig {
  description?: string;
  source?: "user_input" | "extracted" | "callback_data";
  required?: boolean;
  sensitive?: boolean;
  format?: string;
  validation?: string;
  css_selector?: string;
}

export interface ContextConfig {
  documentation?: {
    primary_docs?: string;
    quickstart_guide?: string;
    api_reference?: string;
    sso_guide?: string;
  };
  community?: {
    discord?: string;
    slack?: string;
    forum?: string;
    support_email?: string;
  };
  github_samples?: {
    main_repo?: string;
    examples_repo?: string;
    sample_apps?: string[];
  };
  swagger_spec?: {
    api_spec_url?: string;
    interactive_docs?: string;
    postman_collection?: string;
  };
  opensource_sdk?: {
    node_sdk?: string;
    python_sdk?: string;
    go_sdk?: string;
    java_sdk?: string;
  };
}

export interface SdkConfig {
  preferred_language?: string;
  package_manager?: string;
  framework_hints?: string[];
}

export interface OutputConfig {
  storage_path?: string;
  config_filename?: string;
  credentials_filename?: string;
  mission_brief_filename?: string;
  contextifact_filename?: string;
}

export interface SecurityConfig {
  encrypt_credentials?: boolean;
  credential_expiry_days?: number;
  require_confirmation_for_sensitive?: boolean;
}

export interface FlowInput {
  name: string;
  label?: string;
  sensitive?: boolean;
  placeholder?: string;
}

export interface FlowValidation {
  pattern?: string;
  message?: string;
}

export type FlowStepType =
  | "info"
  | "navigate"
  | "input"
  | "choice"
  | "confirm"
  | "show_commands"
  | "ai_prompt";

export interface FlowStep {
  id: string;
  type: FlowStepType;
  title?: string;
  when?: string;

  // info step
  markdown?: string;

  // navigate step
  url?: string;
  instructions?: string[];

  // input step
  save_to?: string;
  placeholder?: string;
  validate?: FlowValidation;
  inputs?: FlowInput[];

  // choice step
  options?: string[];

  // confirm step
  message?: string;

  // show_commands step
  commands?: string[];

  // ai_prompt step
  provider?: string;
  model?: string;
  prompt_template?: string;

  // Index signature for validator compatibility
  [key: string]: unknown;
}

export interface Flow {
  id: string;
  title: string;
  steps: FlowStep[];
}

export interface BlueprintConfig {
  schema_version?: string;
  smith?: string;
  version?: string;
  name?: string;
  description?: string;
  provider?: string;
  auth?: AuthConfig;
  preview?: PreviewConfig;
  variables?: Record<string, VariableConfig>;
  context?: ContextConfig;
  sdk?: SdkConfig;
  output?: OutputConfig;
  security?: SecurityConfig;
  slugs?: {
    base_url?: string;
    static?: Record<string, string>;
    dynamic?: Record<string, string>;
  };
  contextifact?: {
    prompt_template?: string;
    user_profile?: Record<string, unknown>;
  };
  flows?: Flow[];
  [key: string]: unknown;
}
