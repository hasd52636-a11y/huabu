import React, { useState, useEffect } from 'react';
import { Scheduler, ScheduleConfig, ScheduleInfo, CronParseResult } from '../services/Scheduler';
import { TemplateManager, Template } from '../services/TemplateManager';
import { ExecutionOptions } from '../services/AutoExecutor';

interface ScheduleManagerProps {
  onClose: () => void;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  onClose,
  onError,
  onSuccess
}) => {
  const [scheduler] = useState(() => new Scheduler());
  const [templateManager] = useState(() => new TemplateManager());
  
  const [schedules, setSchedules] = useState<ScheduleInfo[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleInfo | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<ScheduleConfig>>({
    templateId: '',
    cronExpression: '0 9 * * *', // Daily at 9 AM
    enabled: true,
    executionOptions: {},
    description: ''
  });
  const [cronValidation, setCronValidation] = useState<CronParseResult>({ isValid: true });

  useEffect(() => {
    loadData();
    scheduler.start();

    return () => {
      scheduler.stop();
    };
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [scheduleList, templateList] = await Promise.all([
        scheduler.listSchedules(),
        templateManager.listTemplates()
      ]);
      setSchedules(scheduleList);
      setTemplates(templateList);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const validateCronExpression = (expression: string) => {
    const result = scheduler.parseCronExpression(expression);
    setCronValidation(result);
    return result.isValid;
  };

  const handleCreateSchedule = async () => {
    try {
      if (!formData.templateId || !formData.cronExpression) {
        onError('Please fill in all required fields');
        return;
      }

      if (!validateCronExpression(formData.cronExpression)) {
        onError('Invalid cron expression');
        return;
      }

      const config: ScheduleConfig = {
        templateId: formData.templateId,
        cronExpression: formData.cronExpression,
        enabled: formData.enabled || true,
        executionOptions: formData.executionOptions || {},
        description: formData.description,
        maxRuns: formData.maxRuns,
        endDate: formData.endDate
      };

      await scheduler.scheduleExecution(config);
      onSuccess('Schedule created successfully');
      setShowCreateForm(false);
      resetForm();
      await loadData();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to create schedule');
    }
  };

  const handleUpdateSchedule = async () => {
    if (!editingSchedule) return;

    try {
      if (!formData.cronExpression) {
        onError('Cron expression is required');
        return;
      }

      if (!validateCronExpression(formData.cronExpression)) {
        onError('Invalid cron expression');
        return;
      }

      await scheduler.updateSchedule(editingSchedule.id, formData);
      onSuccess('Schedule updated successfully');
      setEditingSchedule(null);
      resetForm();
      await loadData();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to update schedule');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await scheduler.cancelSchedule(scheduleId);
      onSuccess('Schedule deleted successfully');
      await loadData();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to delete schedule');
    }
  };

  const handleToggleSchedule = async (scheduleId: string, enabled: boolean) => {
    try {
      await scheduler.toggleSchedule(scheduleId, enabled);
      onSuccess(`Schedule ${enabled ? 'enabled' : 'disabled'} successfully`);
      await loadData();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to toggle schedule');
    }
  };

  const handleTriggerSchedule = async (scheduleId: string) => {
    try {
      await scheduler.triggerSchedule(scheduleId);
      onSuccess('Schedule triggered successfully');
      await loadData();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to trigger schedule');
    }
  };

  const startEdit = (schedule: ScheduleInfo) => {
    setEditingSchedule(schedule);
    setFormData({
      templateId: schedule.templateId,
      cronExpression: schedule.cronExpression,
      enabled: schedule.enabled,
      executionOptions: schedule.executionOptions,
      description: schedule.description,
      maxRuns: schedule.maxRuns,
      endDate: schedule.endDate
    });
    validateCronExpression(schedule.cronExpression);
  };

  const resetForm = () => {
    setFormData({
      templateId: '',
      cronExpression: '0 9 * * *',
      enabled: true,
      executionOptions: {},
      description: ''
    });
    setCronValidation({ isValid: true });
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'paused': return '#ffc107';
      case 'completed': return '#6c757d';
      case 'failed': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '活跃';
      case 'paused': return '暂停';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="schedule-manager loading">
        <div className="spinner"></div>
        <p>加载调度任务...</p>
      </div>
    );
  }

  return (
    <div className="schedule-manager">
      <div className="schedule-header">
        <h2>定时任务管理</h2>
        <div className="header-actions">
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
          >
            ➕ 新建任务
          </button>
          <button onClick={onClose} className="btn btn-secondary">
            关闭
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingSchedule) && (
        <div className="schedule-form">
          <h3>{editingSchedule ? '编辑任务' : '新建任务'}</h3>
          
          <div className="form-row">
            <label htmlFor="template">选择模板:</label>
            <select
              id="template"
              value={formData.templateId || ''}
              onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
            >
              <option value="">请选择模板</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label htmlFor="cron">Cron表达式:</label>
            <input
              id="cron"
              type="text"
              value={formData.cronExpression || ''}
              onChange={(e) => {
                setFormData({ ...formData, cronExpression: e.target.value });
                validateCronExpression(e.target.value);
              }}
              placeholder="0 9 * * * (每天9点)"
              className={cronValidation.isValid ? '' : 'error'}
            />
            {cronValidation.description && (
              <small className="cron-description">{cronValidation.description}</small>
            )}
            {!cronValidation.isValid && (
              <small className="error-message">{cronValidation.error}</small>
            )}
          </div>

          <div className="form-row">
            <label htmlFor="description">描述:</label>
            <input
              id="description"
              type="text"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="任务描述（可选）"
            />
          </div>

          <div className="form-row">
            <label htmlFor="maxRuns">最大执行次数:</label>
            <input
              id="maxRuns"
              type="number"
              value={formData.maxRuns || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                maxRuns: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              placeholder="不限制"
              min="1"
            />
          </div>

          <div className="form-row">
            <label htmlFor="endDate">结束日期:</label>
            <input
              id="endDate"
              type="datetime-local"
              value={formData.endDate ? formData.endDate.toISOString().slice(0, 16) : ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                endDate: e.target.value ? new Date(e.target.value) : undefined 
              })}
            />
          </div>

          <div className="form-row checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={formData.enabled || false}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              />
              启用任务
            </label>
          </div>

          <div className="form-actions">
            <button
              onClick={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
              className="btn btn-primary"
              disabled={!cronValidation.isValid}
            >
              {editingSchedule ? '更新' : '创建'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setEditingSchedule(null);
                resetForm();
              }}
              className="btn btn-secondary"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Schedule List */}
      <div className="schedule-list">
        {schedules.length === 0 ? (
          <div className="empty-state">
            <p>暂无定时任务</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
            >
              创建第一个任务
            </button>
          </div>
        ) : (
          <div className="schedule-items">
            {schedules.map(schedule => (
              <div key={schedule.id} className="schedule-item">
                <div className="schedule-info">
                  <div className="schedule-title">
                    <h4>{schedule.templateName || schedule.templateId}</h4>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(schedule.status) }}
                    >
                      {getStatusText(schedule.status)}
                    </span>
                  </div>
                  
                  {schedule.description && (
                    <p className="schedule-description">{schedule.description}</p>
                  )}
                  
                  <div className="schedule-details">
                    <div className="detail-item">
                      <span className="label">Cron:</span>
                      <span className="value">{schedule.cronExpression}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">下次执行:</span>
                      <span className="value">{formatDate(schedule.nextRun)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">上次执行:</span>
                      <span className="value">{formatDate(schedule.lastRun)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">执行次数:</span>
                      <span className="value">{schedule.runCount}</span>
                    </div>
                  </div>

                  {schedule.lastResult && (
                    <div className="last-result">
                      <span className="label">上次结果:</span>
                      <span className={`result-status ${schedule.lastResult.status}`}>
                        {schedule.lastResult.status === 'completed' ? '成功' : 
                         schedule.lastResult.status === 'failed' ? '失败' : 
                         schedule.lastResult.status}
                      </span>
                      {schedule.lastResult.statistics && (
                        <span className="result-stats">
                          ({schedule.lastResult.statistics.completedBlocks}/{schedule.lastResult.statistics.totalBlocks} 完成)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="schedule-actions">
                  <button
                    onClick={() => handleToggleSchedule(schedule.id, !schedule.enabled)}
                    className={`btn btn-sm ${schedule.enabled ? 'btn-warning' : 'btn-success'}`}
                  >
                    {schedule.enabled ? '暂停' : '启用'}
                  </button>
                  
                  <button
                    onClick={() => handleTriggerSchedule(schedule.id)}
                    className="btn btn-sm btn-info"
                    disabled={!schedule.enabled}
                  >
                    立即执行
                  </button>
                  
                  <button
                    onClick={() => startEdit(schedule)}
                    className="btn btn-sm btn-secondary"
                  >
                    编辑
                  </button>
                  
                  <button
                    onClick={() => handleDeleteSchedule(schedule.id)}
                    className="btn btn-sm btn-danger"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .schedule-manager {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
        }

        .schedule-manager.loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .schedule-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e0e0e0;
        }

        .schedule-header h2 {
          margin: 0;
          color: #333;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #545b62;
        }

        .btn-success {
          background: #28a745;
          color: white;
        }

        .btn-success:hover:not(:disabled) {
          background: #1e7e34;
        }

        .btn-warning {
          background: #ffc107;
          color: #212529;
        }

        .btn-warning:hover:not(:disabled) {
          background: #e0a800;
        }

        .btn-info {
          background: #17a2b8;
          color: white;
        }

        .btn-info:hover:not(:disabled) {
          background: #117a8b;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c82333;
        }

        .btn-sm {
          padding: 4px 8px;
          font-size: 12px;
        }

        .schedule-form {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 24px;
          border: 1px solid #e0e0e0;
        }

        .schedule-form h3 {
          margin: 0 0 20px 0;
          color: #333;
        }

        .form-row {
          margin-bottom: 16px;
        }

        .form-row label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
          color: #333;
        }

        .form-row input,
        .form-row select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .form-row input.error {
          border-color: #dc3545;
        }

        .checkbox-row label {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .checkbox-row input {
          width: auto;
        }

        .cron-description {
          color: #28a745;
          font-style: italic;
        }

        .error-message {
          color: #dc3545;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .schedule-list {
          margin-top: 24px;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .empty-state p {
          margin-bottom: 16px;
          font-size: 16px;
        }

        .schedule-items {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .schedule-item {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .schedule-info {
          flex: 1;
        }

        .schedule-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .schedule-title h4 {
          margin: 0;
          color: #333;
        }

        .status-badge {
          padding: 2px 8px;
          border-radius: 12px;
          color: white;
          font-size: 12px;
          font-weight: 500;
        }

        .schedule-description {
          margin: 0 0 12px 0;
          color: #666;
          font-style: italic;
        }

        .schedule-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }

        .detail-item {
          display: flex;
          gap: 8px;
        }

        .detail-item .label {
          font-weight: 500;
          color: #666;
          min-width: 80px;
        }

        .detail-item .value {
          color: #333;
        }

        .last-result {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .last-result .label {
          font-weight: 500;
          color: #666;
        }

        .result-status.completed {
          color: #28a745;
          font-weight: 500;
        }

        .result-status.failed {
          color: #dc3545;
          font-weight: 500;
        }

        .result-stats {
          color: #666;
          font-size: 12px;
        }

        .schedule-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-left: 20px;
        }

        @media (max-width: 768px) {
          .schedule-item {
            flex-direction: column;
            gap: 16px;
          }

          .schedule-actions {
            flex-direction: row;
            margin-left: 0;
          }

          .schedule-details {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};