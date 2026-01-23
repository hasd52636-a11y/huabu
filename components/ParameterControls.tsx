/**
 * ParameterControls - 参数控件组件
 * 
 * 功能：
 * - 动态参数控件渲染
 * - 模型特定参数过滤和禁用
 * - 实时验证反馈
 * - 紫色主题 (violet-500)
 * - 多语言支持
 * - 无障碍访问
 * - Phase 1: 基础禁用机制
 */

import React from 'react';
import { Upload, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { 
  GenerationParameters,
  ModelParameter,
  ParameterValidationError
} from '../types';

interface ParameterControlsProps {
  generationType: 'image' | 'video';
  modelId: string;
  parameters: GenerationParameters;
  availableParameters: ModelParameter[];
  onParameterChange: (key: string, value: any) => void;
  validationErrors: ParameterValidationError[];
  syncedParameters?: string[]; // 新增：标识哪些参数是同步来的
  theme?: 'light' | 'dark';
  lang?: 'zh' | 'en';
}

const ParameterControls: React.FC<ParameterControlsProps> = ({
  generationType,
  modelId,
  parameters,
  availableParameters,
  onParameterChange,
  validationErrors,
  syncedParameters = [],
  theme = 'light',
  lang = 'zh'
}) => {
  // 翻译
  const t = {
    zh: {
      prompt: '提示词',
      promptPlaceholder: '描述你想要生成的内容...',
      negativePrompt: '负面提示词',
      negativePromptPlaceholder: '描述你不想要的内容...',
      aspectRatio: '宽高比',
      imageSize: '图像尺寸',
      duration: '视频时长',
      guidanceScale: '引导强度',
      steps: '生成步数',
      seed: '随机种子',
      fps: '帧率',
      motionStrength: '运动强度',
      referenceImage: '参考图片',
      referenceVideo: '参考视频',
      selectFile: '选择文件',
      advancedParameters: '高级参数',
      required: '必填',
      parameterAvailabilityNote: '页面仅显示当前模型支持的参数，灰色选项表示该模型不支持',
      notSupportedByModel: '当前模型不支持此选项',
      seconds: '秒'
    },
    en: {
      prompt: 'Prompt',
      promptPlaceholder: 'Describe what you want to generate...',
      negativePrompt: 'Negative Prompt',
      negativePromptPlaceholder: 'Describe what you don\'t want...',
      aspectRatio: 'Aspect Ratio',
      imageSize: 'Image Size',
      duration: 'Duration',
      guidanceScale: 'Guidance Scale',
      steps: 'Steps',
      seed: 'Seed',
      fps: 'FPS',
      motionStrength: 'Motion Strength',
      referenceImage: 'Reference Image',
      referenceVideo: 'Reference Video',
      selectFile: 'Select File',
      advancedParameters: 'Advanced Parameters',
      required: 'Required',
      parameterAvailabilityNote: 'Only parameters supported by the current model are shown, grayed options are not supported',
      notSupportedByModel: 'Not supported by current model',
      seconds: 'seconds'
    }
  };

  // 获取参数的验证错误
  const getParameterErrors = (parameterKey: string) => {
    return validationErrors.filter(error => error.parameterKey === parameterKey);
  };

  // 检查选项是否被禁用
  const isOptionDisabled = (param: ModelParameter, option: string): boolean => {
    return param.validation.disabledOptions?.includes(option) || false;
  };

  // 渲染参数控件
  const renderParameterControl = (param: ModelParameter) => {
    const value = parameters[param.key as keyof GenerationParameters];
    const errors = getParameterErrors(param.key);
    const hasError = errors.length > 0;
    const isSynced = syncedParameters.includes(param.key);
    
    // 基础样式 - 为同步内容添加特殊样式
    const baseInputStyles = `w-full p-2 sm:p-3 border rounded-lg transition-all duration-200 input-violet ${
      hasError 
        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
        : isSynced
        ? 'border-blue-300 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm shadow-blue-200 dark:shadow-blue-800/30'
        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
    } text-slate-900 dark:text-white ${isSynced ? 'ring-1 ring-blue-200 dark:ring-blue-700' : ''}`;

    // 同步标识组件
    const SyncBadge = () => isSynced ? (
      <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        {lang === 'zh' ? '已同步' : 'Synced'}
      </div>
    ) : null;

    switch (param.type) {
      case 'text':
        return (
          <div className="relative">
            <textarea
              value={value as string || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onParameterChange(param.key, e.target.value)}
              placeholder={param.key === 'prompt' ? t[lang].promptPlaceholder : t[lang].negativePromptPlaceholder}
              className={`${baseInputStyles} textarea-violet resize-none`}
              rows={param.key === 'prompt' ? 3 : 2}
              aria-describedby={hasError ? `${param.key}-error` : undefined}
              aria-invalid={hasError}
            />
            <SyncBadge />
          </div>
        );
      
      case 'select':
        return (
          <select
            value={value as string || param.defaultValue}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onParameterChange(param.key, e.target.value)}
            className={`${baseInputStyles} select-violet`}
            aria-describedby={hasError ? `${param.key}-error` : undefined}
            aria-invalid={hasError}
          >
            {param.validation.options?.map(option => {
              const disabled = isOptionDisabled(param, option);
              return (
                <option 
                  key={option} 
                  value={option}
                  disabled={disabled}
                  className={disabled ? 'text-slate-400 dark:text-slate-500' : ''}
                >
                  {option}{disabled ? ` (${t[lang].notSupportedByModel})` : ''}
                  {param.key === 'duration' && !disabled ? ` ${t[lang].seconds}` : ''}
                </option>
              );
            })}
          </select>
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value as number || param.defaultValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onParameterChange(param.key, parseFloat(e.target.value) || param.defaultValue)}
            min={param.validation.min}
            max={param.validation.max}
            step={param.validation.step || 1}
            className={baseInputStyles}
            aria-describedby={hasError ? `${param.key}-error` : undefined}
            aria-invalid={hasError}
          />
        );
      
      case 'range':
        return (
          <div className="space-y-2">
            <input
              type="range"
              value={value as number || param.defaultValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onParameterChange(param.key, parseFloat(e.target.value))}
              min={param.validation.min}
              max={param.validation.max}
              step={param.validation.step || 0.1}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider-violet"
              aria-describedby={hasError ? `${param.key}-error` : undefined}
              aria-invalid={hasError}
            />
            <div className="flex justify-between text-sm text-slate-500">
              <span>{param.validation.min}</span>
              <span className="font-medium text-violet-600">{value as number || param.defaultValue}</span>
              <span>{param.validation.max}</span>
            </div>
          </div>
        );
      
      case 'boolean':
        return (
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value as boolean || false}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onParameterChange(param.key, e.target.checked)}
              className="mr-3 w-4 h-4 checkbox-violet rounded focus:ring-2 focus:ring-violet-500"
              aria-describedby={hasError ? `${param.key}-error` : undefined}
              aria-invalid={hasError}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {param.description || param.label}
            </span>
          </label>
        );
      
      case 'file':
        return (
          <div className={`border-2 border-dashed rounded-lg p-3 sm:p-4 file-upload-violet ${
            hasError ? 'error' : ''
          }`}>
            <div className="text-center">
              <Upload size={24} className="mx-auto text-slate-400 mb-2 sm:mb-3" />
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-2">
                {param.key.includes('image') ? t[lang].referenceImage : t[lang].referenceVideo}
              </p>
              <input
                type="file"
                accept={param.validation.fileTypes?.join(',') || '*'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (file) onParameterChange(param.key, file);
                }}
                className="hidden"
                id={`file-${param.key}`}
                aria-describedby={hasError ? `${param.key}-error` : undefined}
                aria-invalid={hasError}
              />
              <label
                htmlFor={`file-${param.key}`}
                className="inline-block px-3 py-2 sm:px-4 sm:py-2 btn-violet-primary rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 text-xs sm:text-sm"
                tabIndex={0}
                onKeyDown={(e: React.KeyboardEvent<HTMLLabelElement>) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    document.getElementById(`file-${param.key}`)?.click();
                  }
                }}
              >
                {t[lang].selectFile}
              </label>
              {value && (
                <p className="text-xs text-slate-500 mt-2 break-all">
                  {typeof value === 'string' ? value : (value as File).name}
                </p>
              )}
            </div>
          </div>
        );
      
      default:
        return (
          <input
            type="text"
            value={value as string || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onParameterChange(param.key, e.target.value)}
            className={baseInputStyles}
            aria-describedby={hasError ? `${param.key}-error` : undefined}
            aria-invalid={hasError}
          />
        );
    }
  };

  // 渲染参数组
  const renderParameterGroup = (params: ModelParameter[], title?: string) => {
    if (params.length === 0) return null;

    return (
      <div className="space-y-4 sm:space-y-6">
        {title && (
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
            {title}
          </h3>
        )}
        {params.map(param => (
          <div key={param.key} className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {(t[lang] as any)[param.key] || param.label}
              {param.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderParameterControl(param)}
            {param.description && (
              <p className="text-xs text-slate-500">{param.description}</p>
            )}
            {/* 显示验证错误 */}
            {getParameterErrors(param.key).map((error: ParameterValidationError, index: number) => (
              <div 
                key={index} 
                id={`${param.key}-error`}
                className="flex items-center gap-1 text-red-600 text-xs"
                role="alert"
              >
                <AlertCircle size={12} />
                {error.message}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // 渲染紧凑双列布局的参数组
  const renderCompactParameterGroup = (params: ModelParameter[], title?: string) => {
    if (params.length === 0) return null;

    // 识别可以并排显示的参数对
    const compactPairs: Array<[ModelParameter, ModelParameter?]> = [];
    const remainingParams: ModelParameter[] = [];

    // 定义可以并排显示的参数组合
    const compactCombinations = [
      ['aspectRatio', 'duration'],     // 宽高比 + 视频时长
      ['aspectRatio', 'imageSize'],    // 宽高比 + 图像尺寸
      ['fps', 'motionStrength'],       // 帧率 + 运动强度
      ['guidanceScale', 'steps'],      // 引导强度 + 生成步数
    ];

    const usedParams = new Set<string>();

    // 查找可以配对的参数
    for (const [param1Key, param2Key] of compactCombinations) {
      const param1 = params.find(p => p.key === param1Key && !usedParams.has(p.key));
      const param2 = params.find(p => p.key === param2Key && !usedParams.has(p.key));
      
      if (param1 && param2) {
        compactPairs.push([param1, param2]);
        usedParams.add(param1.key);
        usedParams.add(param2.key);
      } else if (param1) {
        compactPairs.push([param1]);
        usedParams.add(param1.key);
      } else if (param2) {
        compactPairs.push([param2]);
        usedParams.add(param2.key);
      }
    }

    // 添加剩余的单独参数
    params.forEach(param => {
      if (!usedParams.has(param.key)) {
        remainingParams.push(param);
      }
    });

    return (
      <div className="space-y-4 sm:space-y-6">
        {title && (
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
            {title}
          </h3>
        )}
        
        {/* 渲染配对的参数 */}
        {compactPairs.map(([param1, param2], pairIndex) => (
          <div key={`pair-${pairIndex}`} className={param2 ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : ""}>
            {/* 第一个参数 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {(t[lang] as any)[param1.key] || param1.label}
                {param1.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderParameterControl(param1)}
              {param1.description && (
                <p className="text-xs text-slate-500">{param1.description}</p>
              )}
              {getParameterErrors(param1.key).map((error: ParameterValidationError, index: number) => (
                <div 
                  key={index} 
                  id={`${param1.key}-error`}
                  className="flex items-center gap-1 text-red-600 text-xs"
                  role="alert"
                >
                  <AlertCircle size={12} />
                  {error.message}
                </div>
              ))}
            </div>

            {/* 第二个参数（如果存在） */}
            {param2 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {(t[lang] as any)[param2.key] || param2.label}
                  {param2.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderParameterControl(param2)}
                {param2.description && (
                  <p className="text-xs text-slate-500">{param2.description}</p>
                )}
                {getParameterErrors(param2.key).map((error: ParameterValidationError, index: number) => (
                  <div 
                    key={index} 
                    id={`${param2.key}-error`}
                    className="flex items-center gap-1 text-red-600 text-xs"
                    role="alert"
                  >
                    <AlertCircle size={12} />
                    {error.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* 渲染剩余的单独参数 */}
        {remainingParams.map(param => (
          <div key={param.key} className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {(t[lang] as any)[param.key] || param.label}
              {param.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderParameterControl(param)}
            {param.description && (
              <p className="text-xs text-slate-500">{param.description}</p>
            )}
            {getParameterErrors(param.key).map((error: ParameterValidationError, index: number) => (
              <div 
                key={index} 
                id={`${param.key}-error`}
                className="flex items-center gap-1 text-red-600 text-xs"
                role="alert"
              >
                <AlertCircle size={12} />
                {error.message}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // 按类别分组参数
  const basicParameters = availableParameters.filter(param => 
    param.category === 'basic' || !param.category
  );
  const advancedParameters = availableParameters.filter(param => 
    param.category === 'advanced'
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 顶部说明文字 */}
      <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-lg p-3 sm:p-4">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-violet-700 dark:text-violet-300">
            {t[lang].parameterAvailabilityNote}
          </p>
        </div>
      </div>

      {/* 基础参数 - 使用紧凑布局 */}
      {renderCompactParameterGroup(basicParameters)}

      {/* 高级参数 */}
      {advancedParameters.length > 0 && (
        <details className="border border-slate-200 dark:border-slate-700 rounded-lg">
          <summary className="p-3 sm:p-4 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
            {t[lang].advancedParameters}
          </summary>
          <div className="p-3 sm:p-4 pt-0">
            {renderParameterGroup(advancedParameters)}
          </div>
        </details>
      )}
    </div>
  );
};

export default ParameterControls;