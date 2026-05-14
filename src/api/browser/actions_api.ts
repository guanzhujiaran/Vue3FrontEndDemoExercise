import BaseApi from '@/api/base_axios/base_api'
import type { RootObject } from '@/models/api/base_model'
import type {
  ActionExecuteRequest,
  ActionResultResponse,
  ActionPreviewRequest,
  ActionPreviewResponse,
  ActionValidateRequest,
  ActionValidateResponse,
  ExecuteStepRequest,
  ExecuteStepResponse,
  BatchActionRequest,
  ActionMetadataResponse,
  ActionParameterDef,
  JsonSchemaDef,
  JsonSchemaProperty
} from '@/types/browser-automation-api'

class ActionsApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/rpa/browser/control'
  }

  getRegisteredActions(params: {
    browser_id: string
  }): Promise<RootObject<ActionMetadataResponse[]>> {
    return this._post('/actions/registered', { browser_id: params.browser_id })
  }

  getActionMetadata(): Promise<RootObject<ActionMetadataResponse[]>> {
    return this._post('/actions/registered', {})
  }

  executeAction(params: {
    browser_id: string
    action_id: string
    params?: Record<string, any>
    user_data?: Record<string, any> | null
  }): Promise<RootObject<any>> {
    const body = {
      req: {
        action_id: params.action_id,
        params: params.params || {},
        user_data: params.user_data || null
      },
      body: { browser_id: params.browser_id }
    }
    return this._post('/actions/execute', body)
  }

  executeActionsBatch(params: {
    browser_id: string
    actions: Array<{
      action_id: string
      params?: Record<string, any>
      user_data?: Record<string, any> | null
    }>
  }): Promise<RootObject<any>> {
    const body = {
      req: { actions: params.actions },
      body: { browser_id: params.browser_id }
    }
    return this._post('/actions/batch', body)
  }

  previewAction(params: {
    browser_id: string
    action_id: string
    params?: Record<string, any>
  }): Promise<RootObject<any>> {
    const body = {
      req: {
        action_id: params.action_id,
        params: params.params || {}
      },
      body: { browser_id: params.browser_id }
    }
    return this._post('/actions/preview', body)
  }

  validateAction(params: {
    browser_id: string
    action_id: string
    params?: Record<string, any>
  }): Promise<RootObject<ActionValidateResponse>> {
    const body = {
      req: {
        action_id: params.action_id,
        params: params.params || {}
      },
      body: { browser_id: params.browser_id }
    }
    return this._post('/actions/validate', body)
  }

  executeActionStep(params: {
    browser_id: string
    action_id: string
    params?: Record<string, any>
  }): Promise<RootObject<any>> {
    const body = {
      req: {
        action_id: params.action_id,
        params: params.params || {}
      },
      body: { browser_id: params.browser_id }
    }
    return this._post('/actions/execute-step', body)
  }

  listRegisteredActions(): Promise<RootObject<ActionMetadataResponse[]>> {
    return this._post('/actions/registered', {})
  }

  static SCHEMA_TYPE_MAP: Record<string, ActionParameterDef['type']> = {
    string: 'str',
    integer: 'int',
    number: 'float',
    boolean: 'bool',
    array: 'list',
    object: 'dict'
  }

  static ENUM_TYPE_MAP: Record<string, ActionParameterDef['type']> = {
    MouseButtonEnum: 'mousebuttonenum',
    WaitUntilEnum: 'waituntilenum',
    ElementStateEnum: 'elementstateenum',
    ScreenshotTypeEnum: 'screenshottypeenum',
    KeyboardModifierEnum: 'keyboardmodifierenum',
    Position: 'position'
  }

  static resolveRef(ref: string, defs: Record<string, JsonSchemaProperty> | undefined): JsonSchemaProperty | null {
    if (!ref || !defs) return null
    const key = ref.replace('#/$defs/', '')
    return defs[key] || null
  }

  static resolveType(prop: JsonSchemaProperty, defs: Record<string, JsonSchemaProperty> | undefined): { type: ActionParameterDef['type']; enumValues: any[] | null; itemsDef: ActionParameterDef | null; propertiesDef: Record<string, ActionParameterDef> | null } {
    if (prop.$ref) {
      const resolved = ActionsApi.resolveRef(prop.$ref, defs)
      if (resolved) {
        const result = ActionsApi.resolveType(resolved, defs)
        if (resolved.enum) result.enumValues = resolved.enum
        return result
      }
    }

    const schemaType = prop.type || 'string'
    let type = ActionsApi.SCHEMA_TYPE_MAP[schemaType] || 'str'
    let enumValues: any[] | null = prop.enum || null
    let itemsDef: ActionParameterDef | null = null
    let propertiesDef: Record<string, ActionParameterDef> | null = null

    if (prop.items) {
      const itemsRaw = prop.items
      if ('$ref' in itemsRaw && typeof itemsRaw.$ref === 'string') {
        const resolvedRef = ActionsApi.resolveRef(itemsRaw.$ref, defs)
        if (resolvedRef) {
          itemsDef = {
            name: '_item',
            type: ActionsApi.SCHEMA_TYPE_MAP[resolvedRef.type || 'string'] || 'str',
            required: false,
            description: resolvedRef.description || '',
            enum: resolvedRef.enum || null
          }
          if (!enumValues && resolvedRef.enum) enumValues = resolvedRef.enum
        }
      } else {
        itemsDef = ActionsApi.jsonSchemaPropToParamDef('_item', itemsRaw as JsonSchemaProperty, [], defs)
      }
    }

    if (prop.properties) {
      propertiesDef = {}
      for (const [key, val] of Object.entries(prop.properties)) {
        propertiesDef[key] = ActionsApi.jsonSchemaPropToParamDef(key, val, prop.required || [], defs)
      }
    }

    return { type, enumValues, itemsDef, propertiesDef }
  }

  static jsonSchemaPropToParamDef(name: string, prop: JsonSchemaProperty, requiredFields: string[], defs?: Record<string, JsonSchemaProperty>): ActionParameterDef {
    const isRequired = requiredFields.includes(name)

    let actualProp = prop
    let refKey: string | undefined
    let itemsRefKey: string | undefined

    if (prop.anyOf) {
      const nonNullEntry = prop.anyOf.find(entry => !(entry as any).type || (entry as any).type !== 'null')
      if (nonNullEntry && '$ref' in nonNullEntry) {
        refKey = (nonNullEntry.$ref as string).replace('#/$defs/', '')
        const resolved = ActionsApi.resolveRef(nonNullEntry.$ref, defs)
        if (resolved) actualProp = { ...resolved, default: prop.default, description: prop.description || resolved.description } as JsonSchemaProperty
      } else if (nonNullEntry) {
        actualProp = { ...nonNullEntry, default: prop.default, description: prop.description || nonNullEntry.description } as JsonSchemaProperty
        if (nonNullEntry.items && '$ref' in nonNullEntry.items) {
          itemsRefKey = (nonNullEntry.items.$ref as string).replace('#/$defs/', '')
        }
      }
    }

    const { type, enumValues, itemsDef, propertiesDef } = ActionsApi.resolveType(actualProp, defs)

    let finalType: ActionParameterDef['type'] = type
    if (enumValues && refKey) {
      finalType = ActionsApi.ENUM_TYPE_MAP[refKey] || ActionsApi.ENUM_TYPE_MAP[actualProp.title || ''] || type
    } else if (refKey && ActionsApi.ENUM_TYPE_MAP[refKey]) {
      finalType = ActionsApi.ENUM_TYPE_MAP[refKey]
    } else if (itemsRefKey && ActionsApi.ENUM_TYPE_MAP[itemsRefKey]) {
      finalType = ActionsApi.ENUM_TYPE_MAP[itemsRefKey]
    } else if (enumValues) {
      finalType = ActionsApi.ENUM_TYPE_MAP[actualProp.title || ''] || type
    }

    return {
      name,
      type: finalType,
      required: isRequired,
      default: actualProp.default !== undefined ? actualProp.default : undefined,
      description: actualProp.description || '',
      min: actualProp.minimum != null ? Number(actualProp.minimum) : undefined,
      max: actualProp.maximum != null ? Number(actualProp.maximum) : undefined,
      min_length: actualProp.minLength != null ? Number(actualProp.minLength) : undefined,
      max_length: actualProp.maxLength != null ? Number(actualProp.maxLength) : undefined,
      enum: enumValues,
      format: actualProp.format || undefined,
      pattern: actualProp.pattern || undefined,
      items: itemsDef,
      properties: propertiesDef
    }
  }

  static parseJsonSchema(schema: JsonSchemaDef): ActionParameterDef[] {
    if (!schema) return []

    const defs = schema.$defs
    const props = schema.properties
    const required = schema.required || []

    if (!props || Object.keys(props).length === 0) return []

    return Object.entries(props).map(([name, prop]) => {
      return ActionsApi.jsonSchemaPropToParamDef(name, prop, required, defs)
    }).filter(p => p.name)
  }

  static ACTION_TYPE_MAP: Record<string, string> = {
    click: 'click',
    input: 'input',
    navigate: 'navigation',
    new_page: 'navigation',
    scroll: 'scroll',
    wait: 'wait',
    screenshot: 'screenshot',
    llm: 'llm',
    loop: 'custom',
    if_else: 'custom'
  }

  static normalizeActionMetadata(rawAction: any): ActionMetadataResponse {
    let parameters: ActionParameterDef[] = []
    const jsonSchema = rawAction.json_schema

    if (jsonSchema && jsonSchema.properties) {
      parameters = ActionsApi.parseJsonSchema(jsonSchema)
    } else if (Array.isArray(rawAction.parameters)) {
      parameters = rawAction.parameters.map((p: any) => ({
        name: p.name || '',
        type: p.type || 'str',
        required: !!p.required,
        default: p.default !== undefined && p.default !== null ? p.default : undefined,
        description: p.description || '',
        min: p.min != null ? Number(p.min) : undefined,
        max: p.max != null ? Number(p.max) : undefined,
        min_length: p.min_length != null ? Number(p.min_length) : undefined,
        max_length: p.max_length != null ? Number(p.max_length) : undefined,
        enum: Array.isArray(p.enum) ? p.enum : undefined,
        format: p.format || undefined,
        pattern: p.pattern || undefined,
        items: p.items || undefined,
        properties: p.properties || undefined
      }))
    }

    const actionId = rawAction.action_id || rawAction.id || ''

    return {
      action_id: actionId,
      name: actionId,
      description: jsonSchema?.description || '',
      parameters: parameters.length > 0 ? parameters : undefined,
      json_schema: jsonSchema || undefined,
    }
  }
}

const actionsApi = new ActionsApi()
export default actionsApi
export { ActionsApi }