'use client';

import { CheckIcon } from 'lucide-react';
import * as React from 'react';

import {
  ModelSelector,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorContent,
  ModelSelectorTrigger,
  ModelSelectorLogoGroup,
} from '@/components/ai-elements/model-selector';
import {
  PromptInput,
  PromptInputBody,
  PromptInputTools,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputProvider,
  PromptInputTextarea,
  PromptInputActionMenu,
  PromptInputAttachment,
  PromptInputAttachments,
  type PromptInputMessage,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputActionAddAttachments,
} from '@/components/ai-elements/prompt-input';
import { aiChatModels, aiChatModelsChefs, MODELS_PER_CHEF_LIMIT } from '@/lib/constants/ai-chat-models';

type ChatPromptInputProps = {
  model?: string;
  placeholder?: string;
  status?: 'submitted' | 'streaming' | 'ready' | 'error';
  onModelChange?: (model: string) => void;
  onSubmit?: (message: PromptInputMessage, providerName: string) => void;
};

function ChatPromptInput({
  model,
  onModelChange,
  onSubmit,
  placeholder = 'Add a paragraph or edit existing content...',
  status,
}: ChatPromptInputProps) {
  const [modelSelectorOpen, setModelSelectorOpen] = React.useState(false);
  const [modelSearch, setModelSearch] = React.useState('');
  const [expandedChefs, setExpandedChefs] = React.useState<Record<string, boolean>>({});
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const isSearching = modelSearch.trim().length > 0;

  function toggleChefExpanded(chef: string) {
    setExpandedChefs((prev) => {
      return { ...prev, [chef]: !prev[chef] };
    });
  }

  const selectedModelData =
    aiChatModels.find((m) => {
      return m.id === model;
    }) ?? aiChatModels[0];

  function handleSubmit(message: PromptInputMessage) {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    if (!selectedModelData) {
      return;
    }

    onSubmit?.(message, selectedModelData.providerId);
  }

  return (
    <div className="size-full">
      <PromptInputProvider>
        <PromptInput isMultiple hasGlobalDrop onSubmit={handleSubmit}>
          <PromptInputAttachments>
            {(attachment) => {
              return <PromptInputAttachment data={attachment} />;
            }}
          </PromptInputAttachments>
          <PromptInputBody>
            <PromptInputTextarea ref={textareaRef} placeholder={placeholder} />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <ModelSelector open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
                <ModelSelectorTrigger asChild>
                  <PromptInputButton>
                    {selectedModelData?.chefSlug && <ModelSelectorLogo provider={selectedModelData.chefSlug} />}
                    {selectedModelData?.name && <ModelSelectorName>{selectedModelData.name}</ModelSelectorName>}
                  </PromptInputButton>
                </ModelSelectorTrigger>
                <ModelSelectorContent>
                  <ModelSelectorInput
                    value={modelSearch}
                    placeholder="Search models..."
                    onValueChange={setModelSearch}
                  />
                  <ModelSelectorList>
                    <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                    {aiChatModelsChefs.map((chef) => {
                      const chefModels = aiChatModels.filter((m) => {
                        return m.chef === chef;
                      });
                      const isExpanded = expandedChefs[chef];
                      const canToggle = !isSearching && chefModels.length > MODELS_PER_CHEF_LIMIT;
                      const visibleModels =
                        canToggle && !isExpanded ? chefModels.slice(0, MODELS_PER_CHEF_LIMIT) : chefModels;

                      return (
                        <ModelSelectorGroup
                          key={chef}
                          heading={
                            <span className="flex items-center justify-between">
                              {chef}
                              {canToggle && (
                                <button
                                  type="button"
                                  className="hover:text-foreground font-medium normal-case transition-colors"
                                  onClick={() => {
                                    return toggleChefExpanded(chef);
                                  }}
                                >
                                  {isExpanded ? 'See less' : 'See all'}
                                </button>
                              )}
                            </span>
                          }
                        >
                          {visibleModels.map((m) => {
                            return (
                              <ModelSelectorItem
                                key={m.id}
                                value={m.id}
                                onSelect={() => {
                                  onModelChange?.(m.id);
                                  setModelSelectorOpen(false);
                                }}
                              >
                                <ModelSelectorLogo provider={m.chefSlug} />
                                <ModelSelectorName>{m.name}</ModelSelectorName>
                                <ModelSelectorLogoGroup>
                                  {m.providers.map((provider) => {
                                    return <ModelSelectorLogo key={provider} provider={provider} />;
                                  })}
                                </ModelSelectorLogoGroup>
                                {model === m.id ? (
                                  <CheckIcon className="ml-auto size-4" />
                                ) : (
                                  <div className="ml-auto size-4" />
                                )}
                              </ModelSelectorItem>
                            );
                          })}
                        </ModelSelectorGroup>
                      );
                    })}
                  </ModelSelectorList>
                </ModelSelectorContent>
              </ModelSelector>
            </PromptInputTools>
            <PromptInputSubmit status={status} />
          </PromptInputFooter>
        </PromptInput>
      </PromptInputProvider>
    </div>
  );
}

export default ChatPromptInput;
