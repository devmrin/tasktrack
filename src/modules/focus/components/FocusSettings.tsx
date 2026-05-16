import { useEffect } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useSettingsDialogFooter } from '@/contexts/settings-dialog-footer-context';
import { useToast } from '@/hooks/useToast';
import { usePomodoroSettings } from '@/modules/focus/hooks/usePomodoroSettings';
import type { PomodoroSettings } from '@/modules/focus/types';

const FOCUS_SETTINGS_FORM_ID = 'focus-pomodoro-settings-form';

const pomodoroSettingsSchema = Yup.object({
  workDuration: Yup.number().min(1).max(120).required(),
  shortBreakDuration: Yup.number().min(1).max(30).required(),
  longBreakDuration: Yup.number().min(1).max(60).required(),
  longBreakInterval: Yup.number().min(1).max(12).required(),
  autoStartBreaks: Yup.boolean().required(),
  autoStartPomodoros: Yup.boolean().required(),
  chimeOnTimerComplete: Yup.boolean().required(),
});

const stepperBtnClass =
  'flex size-5 shrink-0 items-center justify-center bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors disabled:opacity-40 disabled:pointer-events-none';

function NumberField({
  label,
  name,
  min,
  max,
  suffix,
  value,
  onChange,
}: {
  readonly label: string;
  readonly name: string;
  readonly min: number;
  readonly max: number;
  readonly suffix: string;
  readonly value: number;
  readonly onChange: (name: string, value: number) => void;
}) {
  const clamped = Math.min(Math.max(value, min), max);
  const setValue = (v: number) => {
    const n = Math.min(Math.max(v, min), max);
    onChange(name, n);
  };

  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm text-neutral-700 dark:text-neutral-300">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex items-stretch rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 overflow-hidden">
          <input
            type="number"
            name={name}
            value={value}
            min={min}
            max={max}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isNaN(n) && n >= min && n <= max) {
                onChange(name, n);
              }
            }}
            className={`number-input-no-spinner w-14 px-2 py-1.5 text-sm text-right text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-inset focus:ring-neutral-400 dark:focus:ring-neutral-500 bg-transparent border-0 [&:focus]:outline-none`}
          />
          <div className="flex flex-col border-l border-neutral-300 dark:border-neutral-600">
            <button
              type="button"
              aria-label="Increase"
              onClick={() => setValue(clamped + 1)}
              disabled={clamped >= max}
              className={`${stepperBtnClass} rounded-tr`}
            >
              <ChevronUp className="size-3" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Decrease"
              onClick={() => setValue(clamped - 1)}
              disabled={clamped <= min}
              className={`${stepperBtnClass} border-t border-neutral-300 dark:border-neutral-600 rounded-br`}
            >
              <ChevronDown className="size-3" aria-hidden />
            </button>
          </div>
        </div>
        <span className="text-xs text-neutral-500 dark:text-neutral-400 w-12">{suffix}</span>
      </div>
    </label>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onToggle,
}: {
  readonly label: string;
  readonly description: string;
  readonly checked: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div>
        <span className="text-sm text-neutral-700 dark:text-neutral-300">{label}</span>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked
            ? 'bg-neutral-800 dark:bg-neutral-200'
            : 'bg-neutral-300 dark:bg-neutral-600'
        }`}
      >
        <span
          className={`inline-block size-3.5 rounded-full bg-white dark:bg-neutral-900 transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </label>
  );
}

function FocusSettingsFooter({
  dirty,
  isSubmitting,
}: {
  readonly dirty: boolean;
  readonly isSubmitting: boolean;
}) {
  const { setFooter } = useSettingsDialogFooter();
  useEffect(() => {
    if (!dirty) {
      setFooter(null);
      return undefined;
    }
    setFooter(
      <button
        type="submit"
        form={FOCUS_SETTINGS_FORM_ID}
        disabled={isSubmitting}
        className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        <Check className="size-4" aria-hidden />
        {isSubmitting ? 'Saving...' : 'Save changes'}
      </button>,
    );
    return () => {
      setFooter(null);
    };
  }, [dirty, isSubmitting, setFooter]);
  return null;
}

export function FocusSettings() {
  const { settings, updateSettings, loaded } = usePomodoroSettings();
  const { showToast } = useToast();

  if (!loaded) {
    return (
      <div className="text-sm text-neutral-500 dark:text-neutral-400">Loading...</div>
    );
  }

  const handleSave = async (values: PomodoroSettings) => {
    try {
      await updateSettings(values);
      showToast('Focus settings saved');
    } catch {
      showToast('Could not save focus settings');
    }
  };

  return (
    <Formik<PomodoroSettings>
      initialValues={settings}
      validationSchema={pomodoroSettingsSchema}
      onSubmit={handleSave}
      enableReinitialize
    >
      {({ values, dirty, isSubmitting, setFieldValue }) => (
        <>
          <FocusSettingsFooter dirty={dirty} isSubmitting={isSubmitting} />
          <Form id={FOCUS_SETTINGS_FORM_ID} className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
              Timer Durations
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Customize the length of each pomodoro phase.
            </p>
            <div className="space-y-3">
              <NumberField
                label="Pomodoro"
                name="workDuration"
                value={values.workDuration}
                min={1}
                max={120}
                suffix="min"
                onChange={(n, v) => setFieldValue(n, v)}
              />
              <NumberField
                label="Short Break"
                name="shortBreakDuration"
                value={values.shortBreakDuration}
                min={1}
                max={30}
                suffix="min"
                onChange={(n, v) => setFieldValue(n, v)}
              />
              <NumberField
                label="Long Break"
                name="longBreakDuration"
                value={values.longBreakDuration}
                min={1}
                max={60}
                suffix="min"
                onChange={(n, v) => setFieldValue(n, v)}
              />
              <NumberField
                label="Long Break Interval"
                name="longBreakInterval"
                value={values.longBreakInterval}
                min={1}
                max={12}
                suffix="sessions"
                onChange={(n, v) => setFieldValue(n, v)}
              />
            </div>
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
              Auto-start
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Automatically start the next phase when one ends.
            </p>
            <div className="space-y-4">
              <ToggleField
                label="Auto-start breaks"
                description="Start break timer automatically after a pomodoro"
                checked={values.autoStartBreaks}
                onToggle={() => setFieldValue('autoStartBreaks', !values.autoStartBreaks)}
              />
              <ToggleField
                label="Auto-start pomodoros"
                description="Start work timer automatically after a break"
                checked={values.autoStartPomodoros}
                onToggle={() => setFieldValue('autoStartPomodoros', !values.autoStartPomodoros)}
              />
            </div>
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
              Sounds
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Audio feedback when a timer phase finishes.
            </p>
            <ToggleField
              label="Completion sounds"
              description="Play a chime when a work session ends and a tone when a break ends."
              checked={values.chimeOnTimerComplete}
              onToggle={() => setFieldValue('chimeOnTimerComplete', !values.chimeOnTimerComplete)}
            />
          </div>
        </Form>
        </>
      )}
    </Formik>
  );
}
