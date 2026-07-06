import { Eye, EyeOff, CircleXIcon, ExternalLink, CircleAlertIcon, CircleCheckIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';

import ClaudeIcon from '@/components/icons/claude';
import OpenAiIcon from '@/components/icons/openai';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form, FormItem, FormField, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import QuantumLoader from '@/components/ui/quantum-loader';

type ApiKeyRowProps = {
  isDisabled?: boolean;
  isEditing: boolean;
  isInputValueShown: boolean;
  isRemoving: boolean;
  isSaving: boolean;
  isSet: boolean;
  isTesting: boolean;
  providerLabel: string;
  providerPlatformUrl?: string;
  onCancel: () => void;
  onEditToggle?: () => void;
  onRemove: () => void;
  onSave: (apiKey: string) => void;
  onShowInputValueToggle: () => void;
  onTestConnection: (value: string) => void;
  form: UseFormReturn<{
    apiKey: string;
  }>;
  serverValidation: {
    error?: string;
    isValid: boolean;
    tested?: boolean;
  } | null;
};

const icons: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  claude: ClaudeIcon,
  openai: OpenAiIcon,
};

function ApiKeyRow({
  form,
  isDisabled = false,
  isEditing,
  isInputValueShown,
  isRemoving,
  isSaving,
  isSet,
  isTesting,
  onCancel,
  onEditToggle,
  onRemove,
  onSave,
  onShowInputValueToggle,
  onTestConnection,
  providerLabel,
  providerPlatformUrl,
  serverValidation,
}: ApiKeyRowProps) {
  function saveApiKey(data: { apiKey: string }) {
    void onSave(data.apiKey);
  }

  const apiKeyValue = useWatch({
    control: form.control,
    name: 'apiKey',
  });

  const Icon = icons[providerLabel.toLowerCase()];

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="size-5" />
          <div>
            <div className="font-medium">{providerLabel} API Key</div>
            <div className="text-muted-foreground flex items-center gap-1 text-sm">
              {isSet ? (
                <>
                  <span>Set</span>
                  <CircleCheckIcon size={14} />
                </>
              ) : (
                <>
                  <span>Not set</span>
                  <CircleXIcon size={14} />
                </>
              )}
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" disabled={isDisabled} onClick={onEditToggle}>
          {isSet ? 'Edit' : 'Set'}
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(saveApiKey)}>
        <FormField
          name="apiKey"
          control={form.control}
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel htmlFor={`${providerLabel}-api-key`}>{providerLabel}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      autoFocus
                      className="pr-10"
                      autoComplete="off"
                      placeholder="sk-..."
                      id={`${providerLabel}-api-key`}
                      type={isInputValueShown ? 'text' : 'password'}
                      {...field}
                    />
                    <Button
                      size="xs"
                      type="button"
                      variant="ghost"
                      onClick={onShowInputValueToggle}
                      className="absolute top-1.5 right-1.5 px-3"
                    >
                      {isInputValueShown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </FormControl>
                <FormDescription>
                  Your {providerLabel} API key is {isSet ? 'set' : 'not set'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {serverValidation && (
          <Alert variant={serverValidation.isValid ? 'success' : 'destructive'}>
            {serverValidation.isValid ? (
              <>
                <CircleCheckIcon size={16} />
                <AlertTitle>Connection Test Successful</AlertTitle>
                <AlertDescription>Your API key is valid and working!</AlertDescription>
              </>
            ) : (
              <>
                <CircleAlertIcon size={16} />
                <AlertTitle>Connection Test Failure</AlertTitle>
                <AlertDescription>{serverValidation.error}</AlertDescription>
              </>
            )}
          </Alert>
        )}

        {providerPlatformUrl && (
          <div className="text-muted-foreground flex gap-1 text-sm">
            Get your API key from{' '}
            <div className="flex items-center gap-1 text-sky-700 hover:text-sky-900 hover:underline dark:text-sky-500 dark:hover:text-sky-400">
              <Link target="_blank" rel="noopener noreferrer" href={providerPlatformUrl}>
                {providerLabel} Platform
              </Link>
              <ExternalLink className="size-3.5" />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {!!apiKeyValue && (
            <Button
              type="button"
              variant="outline"
              disabled={isTesting}
              className="space-x-2"
              onClick={() => {
                return onTestConnection(apiKeyValue);
              }}
            >
              {isTesting && <QuantumLoader size={16} color="var(--foreground)" />}
              Test Connection
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onRemove} variant="destructive" disabled={isTesting || !isSet}>
            {isRemoving && <QuantumLoader size={16} color="var(--color-white)" />}
            Remove
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <QuantumLoader size={16} color="var(--primary-foreground)" />}
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default React.memo(ApiKeyRow);
