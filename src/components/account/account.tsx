'use client';

import { UserProfile } from '@clerk/nextjs';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyIcon, InfoIcon } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useConfirm } from '@/components/providers/confirm-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { updateUserApiKey } from '@/lib/actions/user.actions';
import validateApiKeyWithServer from '@/lib/utils/validate-api-key';

import ApiKeyRow from './api-key-row';

type AccountProps = {
  hasClaudeApiKey: boolean;
  hasOpenaiApiKey: boolean;
};

type ServerValidation = {
  error?: string;
  isValid: boolean;
  tested?: boolean;
};

const providerLabels: Record<'openai' | 'claude', string> = {
  claude: 'Claude',
  openai: 'OpenAI',
};

const apiFormSchema = z.object({
  apiKey: z.string().nonempty('Please enter an API Key'),
});

function useApiKeyRow(provider: 'openai' | 'claude') {
  const [isInputValueShown, setIsInputValueShown] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [serverValidation, setServerValidation] = React.useState<ServerValidation | null>(null);
  const { confirm } = useConfirm();
  const providerLabel = providerLabels[provider];

  const form = useForm({
    defaultValues: { apiKey: '' },
    mode: 'onSubmit',
    resolver: zodResolver(apiFormSchema),
  });

  async function onSave(apiKey: string) {
    try {
      setIsSaving(true);
      await updateUserApiKey(provider, apiKey);
      setIsEditing(false);
      setServerValidation(null);
      form.reset();
    } catch {
      setServerValidation({ error: 'Failed to save API key. Please try again.', isValid: false });
    } finally {
      setIsSaving(false);
    }
  }

  async function onRemove() {
    try {
      const confirmed = await confirm({
        cancelText: 'Cancel',
        confirmText: 'Remove',
        description: `Are you sure you want to remove your ${providerLabel} API key? This action cannot be undone.`,
        title: `Remove ${providerLabel} API Key`,
        variant: 'destructive',
      });

      if (!confirmed) {
        return;
      }

      setIsRemoving(true);
      await updateUserApiKey(provider, '');
      setIsEditing(false);
      setServerValidation(null);
      form.reset();
    } catch {
      setServerValidation({ error: 'Failed to remove API key. Please try again.', isValid: false });
    } finally {
      setIsRemoving(false);
    }
  }

  async function onTestConnection(value: string = '') {
    try {
      setIsTesting(true);
      setServerValidation(null);
      const result = await validateApiKeyWithServer(value, provider);
      setServerValidation({ ...result, tested: true });
    } catch {
      setServerValidation({ error: 'Connection test failed. Please try again.', isValid: false, tested: true });
    } finally {
      setIsTesting(false);
    }
  }

  function onCancel() {
    form.reset();
    setIsEditing(false);
    setServerValidation(null);
  }

  function onEditToggle() {
    setIsEditing((prev) => {
      return !prev;
    });
    setServerValidation(null);
    form.reset();
  }

  function onShowInputValueToggle() {
    setIsInputValueShown((prev) => {
      return !prev;
    });
  }

  return {
    form,
    isEditing,
    isInputValueShown,
    isRemoving,
    isSaving,
    isTesting,
    onCancel,
    onEditToggle,
    onRemove,
    onSave,
    onShowInputValueToggle,
    onTestConnection,
    providerLabel,
    serverValidation,
    setIsEditing,
  };
}

export default function Account({ hasClaudeApiKey, hasOpenaiApiKey }: AccountProps) {
  const openAiApiKeyRow = useApiKeyRow('openai');
  const claudeApiKeyRow = useApiKeyRow('claude');

  return (
    <UserProfile
      appearance={{
        elements: {
          profileSection: 'border-t-border!',
          rootBox: 'max-h-full mt-8',
        },
      }}
    >
      <UserProfile.Page url="/api-keys" label="API Keys" labelIcon={<KeyIcon size={16} />}>
        <div className="space-y-4 [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:pb-4">
          <h1 className="text-lg">API Keys</h1>

          <ApiKeyRow
            {...openAiApiKeyRow}
            isSet={hasOpenaiApiKey}
            isDisabled={claudeApiKeyRow.isEditing}
            providerPlatformUrl="https://platform.openai.com/account/api-keys"
          />

          <ApiKeyRow
            {...claudeApiKeyRow}
            isSet={hasClaudeApiKey}
            isDisabled={openAiApiKeyRow.isEditing}
            providerPlatformUrl="https://platform.claude.com/settings/keys"
          />

          {(openAiApiKeyRow.isEditing || claudeApiKeyRow.isEditing) && (
            <Alert>
              <InfoIcon />
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-5">
                  <li>For security reasons, API keys are only stored encrypted and cannot be viewed once set</li>
                  <li>To change an existing API key, you will need to set a new key</li>
                  <li>You can always remove an API key from Smartext if you no longer wish to use it</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </UserProfile.Page>
    </UserProfile>
  );
}
