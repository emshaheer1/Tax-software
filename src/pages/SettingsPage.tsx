import { useState } from 'react';
import { Button } from '../components/Button.tsx';
import { Card } from '../components/Card.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { BracketEditor } from './BracketEditor.tsx';
import { useSettings } from '../state/settings-context.tsx';
import { useToast } from '../components/Toast.tsx';

export function SettingsPage() {
  const { resetSettings } = useSettings();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/12 pb-3">
        <div>
          <h1 className="text-lg">Settings</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-muted">
            Bracket tables sit side by side. The formulas are below.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setConfirmReset(true)}>
          Reset to defaults
        </Button>
      </div>

      <section aria-label="Tax brackets" className="space-y-3">
        <h2 className="text-sm">Tax brackets</h2>
        <BracketEditor />
      </section>

      <section aria-label="Calculation settings" className="space-y-3">
        <h2 className="text-sm">Calculation settings</h2>
        <Card title="How each result is calculated">
          <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-ink-muted">
            <li>The Workflow page can change the formulas. Every result follows the formula saved there.</li>
            <li>Standard deduction comes from the selected status table.</li>
            <li>On an LCD option, AGI × 30% or AGI × 50%, and that amount ÷ 5, are shown only as a guide. They are not used in the preview.</li>
            <li>The max donation you type sets the write-off to that donation × 5. The preview uses those typed amounts.</li>
            <li>Deduction used = the larger of the standard deduction or the typed write-off. They are not added together.</li>
            <li>Gas and oil and QBI, when typed, come off taxable income in addition. Left blank, they are zero.</li>
            <li>Now taxable income = AGI − standard deduction − QBI.</li>
            <li>Option taxable income = AGI − deduction used − QBI − gas and oil.</li>
            <li>Federal tax is exact bracket math from the selected table.</li>
            <li>Tax saved = Now tax − option tax. Cash out = donation + gas and oil. Net = tax saved − cash out − planning fees.</li>
          </ul>
        </Card>
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="Reset settings?"
        body="Tax brackets will return to the 2026 workbook defaults."
        confirmLabel="Reset to defaults"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetSettings();
          setConfirmReset(false);
          toast('Settings reset to 2026 defaults.');
        }}
      />
    </div>
  );
}
