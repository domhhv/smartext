'use client';

import type { ChatStatus, FileUIPart } from 'ai';
import {
  XIcon,
  MicIcon,
  PlusIcon,
  ImageIcon,
  SquareIcon,
  Loader2Icon,
  PaperclipIcon,
  CornerDownLeftIcon,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import Image from 'next/image';
import * as React from 'react';
import type {
  ReactNode,
  RefObject,
  ChangeEvent,
  SubmitEvent,
  ComponentProps,
  HTMLAttributes,
  PropsWithChildren,
  ChangeEventHandler,
  SubmitEventHandler,
  KeyboardEventHandler,
  ClipboardEventHandler,
} from 'react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandItem,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandSeparator,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group';
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from '@/components/ui/select';
import cn from '@/lib/utils/cn';

// ============================================================================
// Provider Context & Types
// ============================================================================

export type AttachmentsContext = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  files: (FileUIPart & { id: string })[];
  add: (files: File[] | FileList) => void;
  clear: () => void;
  openFileDialog: () => void;
  remove: (id: string) => void;
};

export type TextInputContext = {
  value: string;
  clear: () => void;
  setInput: (v: string) => void;
};

export type PromptInputControllerProps = {
  attachments: AttachmentsContext;
  textInput: TextInputContext;
  /** INTERNAL: Allows PromptInput to register its file textInput + "open" callback */
  __registerFileInput: (ref: RefObject<HTMLInputElement | null>, open: () => void) => void;
};

const PromptInputController = React.createContext<PromptInputControllerProps | null>(null);
const ProviderAttachmentsContext = React.createContext<AttachmentsContext | null>(null);

export function usePromptInputController() {
  const ctx = React.useContext(PromptInputController);

  if (!ctx) {
    throw new Error('Wrap your component inside <PromptInputProvider> to use usePromptInputController().');
  }

  return ctx;
}

// Optional variants (do NOT throw). Useful for dual-mode components.
function useOptionalPromptInputController() {
  return React.useContext(PromptInputController);
}

export function useProviderAttachments() {
  const ctx = React.useContext(ProviderAttachmentsContext);

  if (!ctx) {
    throw new Error('Wrap your component inside <PromptInputProvider> to use useProviderAttachments().');
  }

  return ctx;
}

function useOptionalProviderAttachments() {
  return React.useContext(ProviderAttachmentsContext);
}

export type PromptInputProviderProps = PropsWithChildren<{
  initialInput?: string;
}>;

/**
 * Optional global provider that lifts PromptInput state outside of PromptInput.
 * If you don't use it, PromptInput stays fully self-managed.
 */
export function PromptInputProvider({ children, initialInput: initialTextInput = '' }: PromptInputProviderProps) {
  // ----- textInput state
  const [textInput, setTextInput] = React.useState(initialTextInput);
  const clearInput = React.useCallback(() => {
    return setTextInput('');
  }, []);

  // ----- attachments state (global when wrapped)
  const [attachements, setAttachements] = React.useState<(FileUIPart & { id: string })[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const openRef = React.useRef<() => void>(() => {});

  const add = React.useCallback((files: File[] | FileList) => {
    const incoming = Array.from(files);

    if (incoming.length === 0) {
      return;
    }

    setAttachements((prev) => {
      return prev.concat(
        incoming.map((file) => {
          return {
            filename: file.name,
            id: nanoid(),
            mediaType: file.type,
            type: 'file' as const,
            url: URL.createObjectURL(file),
          };
        })
      );
    });
  }, []);

  const remove = React.useCallback((id: string) => {
    setAttachements((prev) => {
      const found = prev.find((f) => {
        return f.id === id;
      });

      if (found?.url) {
        URL.revokeObjectURL(found.url);
      }

      return prev.filter((f) => {
        return f.id !== id;
      });
    });
  }, []);

  const clear = React.useCallback(() => {
    setAttachements((prev) => {
      for (const f of prev) {
        if (f.url) {
          URL.revokeObjectURL(f.url);
        }
      }

      return [];
    });
  }, []);

  const openFileDialog = React.useCallback(() => {
    openRef.current?.();
  }, []);

  const attachments = React.useMemo<AttachmentsContext>(() => {
    return {
      add,
      clear,
      fileInputRef,
      files: attachements,
      openFileDialog,
      remove,
    };
  }, [attachements, add, remove, clear, openFileDialog]);

  const __registerFileInput = React.useCallback((ref: RefObject<HTMLInputElement | null>, open: () => void) => {
    fileInputRef.current = ref.current;
    openRef.current = open;
  }, []);

  const controller = React.useMemo<PromptInputControllerProps>(() => {
    return {
      __registerFileInput,
      attachments,
      textInput: {
        clear: clearInput,
        setInput: setTextInput,
        value: textInput,
      },
    };
  }, [textInput, clearInput, attachments, __registerFileInput]);

  return (
    <PromptInputController.Provider value={controller}>
      <ProviderAttachmentsContext.Provider value={attachments}>{children}</ProviderAttachmentsContext.Provider>
    </PromptInputController.Provider>
  );
}

// ============================================================================
// Component Context & Hooks
// ============================================================================

const LocalAttachmentsContext = React.createContext<AttachmentsContext | null>(null);

export function usePromptInputAttachments() {
  // Dual-mode: prefer provider if present, otherwise use local
  const provider = useOptionalProviderAttachments();
  const local = React.useContext(LocalAttachmentsContext);
  const context = provider ?? local;

  if (!context) {
    throw new Error('usePromptInputAttachments must be used within a PromptInput or PromptInputProvider');
  }

  return context;
}

export type PromptInputAttachmentProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  data: FileUIPart & { id: string };
};

export function PromptInputAttachment({ className, data, ...props }: PromptInputAttachmentProps) {
  const attachments = usePromptInputAttachments();

  const filename = data.filename || '';

  const mediaType = data.mediaType?.startsWith('image/') && data.url ? 'image' : 'file';
  const isImage = mediaType === 'image';

  const attachmentLabel = filename || (isImage ? 'Image' : 'Attachment');

  return (
    <PromptInputHoverCard>
      <HoverCardTrigger asChild>
        <div
          key={data.id}
          className={cn(
            'group border-border hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 relative flex h-8 cursor-default items-center gap-1.5 rounded-md border px-1.5 text-sm font-medium transition-all select-none',
            className
          )}
          {...props}
        >
          <div className="relative size-5 shrink-0">
            <div className="bg-background absolute inset-0 flex size-5 items-center justify-center overflow-hidden rounded transition-opacity group-hover:opacity-0">
              {isImage ? (
                <Image
                  width={20}
                  height={20}
                  src={data.url}
                  alt={filename || 'attachment'}
                  className="size-5 object-cover"
                />
              ) : (
                <div className="text-muted-foreground flex size-5 items-center justify-center">
                  <PaperclipIcon className="size-3" />
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              aria-label="Remove attachment"
              onClick={(e) => {
                e.stopPropagation();
                attachments.remove(data.id);
              }}
              className="absolute inset-0 size-5 cursor-pointer rounded p-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 [&>svg]:size-2.5"
            >
              <XIcon />
              <span className="sr-only">Remove</span>
            </Button>
          </div>

          <span className="flex-1 truncate">{attachmentLabel}</span>
        </div>
      </HoverCardTrigger>
      <PromptInputHoverCardContent className="w-auto p-2">
        <div className="w-auto space-y-3">
          {isImage && (
            <div className="flex max-h-96 w-96 items-center justify-center overflow-hidden rounded-md border">
              <Image
                width={448}
                height={384}
                src={data.url}
                alt={filename || 'attachment preview'}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <div className="min-w-0 flex-1 space-y-1 px-0.5">
              <h4 className="truncate text-sm leading-none font-semibold">
                {filename || (isImage ? 'Image' : 'Attachment')}
              </h4>
              {data.mediaType && <p className="text-muted-foreground truncate font-mono text-xs">{data.mediaType}</p>}
            </div>
          </div>
        </div>
      </PromptInputHoverCardContent>
    </PromptInputHoverCard>
  );
}

export type PromptInputAttachmentsProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: (attachment: FileUIPart & { id: string }) => ReactNode;
};

export function PromptInputAttachments({ children, className, ...props }: PromptInputAttachmentsProps) {
  const attachments = usePromptInputAttachments();

  if (!attachments.files.length) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2 p-3', className)} {...props}>
      {attachments.files.map((file) => {
        return <React.Fragment key={file.id}>{children(file)}</React.Fragment>;
      })}
    </div>
  );
}

export type PromptInputActionAddAttachmentsProps = ComponentProps<typeof DropdownMenuItem> & {
  label?: string;
};

export function PromptInputActionAddAttachments({
  label = 'Add photos or files',
  ...props
}: PromptInputActionAddAttachmentsProps) {
  const attachments = usePromptInputAttachments();

  return (
    <DropdownMenuItem
      {...props}
      onSelect={(e) => {
        e.preventDefault();
        attachments.openFileDialog();
      }}
    >
      <ImageIcon className="mr-2 size-4" /> {label}
    </DropdownMenuItem>
  );
}

export type PromptInputMessage = {
  files: FileUIPart[];
  text: string;
};

export type PromptInputProps = Omit<HTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onError'> & {
  accept?: string; // e.g., "image/*" or leave undefined for any
  // When true, accepts drops anywhere on document. Default false (opt-in).
  hasGlobalDrop?: boolean;
  // Render a hidden input with given name and keep it in sync for native form posts. Default false.
  hasSyncHiddenInput?: boolean;
  isMultiple?: boolean;
  // Minimal constraints
  maxFiles?: number;
  maxFileSize?: number; // bytes
  onError?: (err: { code: 'max_files' | 'max_file_size' | 'accept'; message: string }) => void;
  onSubmit: (message: PromptInputMessage, event: SubmitEvent<HTMLFormElement>) => void | Promise<void>;
};

export function PromptInput({
  accept,
  children,
  className,
  hasGlobalDrop,
  hasSyncHiddenInput,
  isMultiple,
  maxFiles,
  maxFileSize,
  onError,
  onSubmit,
  ...props
}: PromptInputProps) {
  // Try to use a provider controller if present
  const controller = useOptionalPromptInputController();
  const usingProvider = !!controller;

  // Refs
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const anchorRef = React.useRef<HTMLSpanElement>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  // Find nearest form to scope drag & drop
  React.useEffect(() => {
    const root = anchorRef.current?.closest('form');

    if (root instanceof HTMLFormElement) {
      formRef.current = root;
    }
  }, []);

  // ----- Local attachments (only used when no provider)
  const [items, setItems] = React.useState<(FileUIPart & { id: string })[]>([]);
  const files = usingProvider ? controller.attachments.files : items;

  const openFileDialogLocal = React.useCallback(() => {
    inputRef.current?.click();
  }, []);

  const matchesAccept = React.useCallback(
    (f: File) => {
      if (!accept || accept.trim() === '') {
        return true;
      }

      if (accept.includes('image/*')) {
        return f.type.startsWith('image/');
      }

      // NOTE: keep simple; expand as needed
      return true;
    },
    [accept]
  );

  const addLocal = React.useCallback(
    (fileList: File[] | FileList) => {
      const incoming = Array.from(fileList);
      const accepted = incoming.filter((f) => {
        return matchesAccept(f);
      });

      if (incoming.length && accepted.length === 0) {
        onError?.({
          code: 'accept',
          message: 'No files match the accepted types.',
        });

        return;
      }

      function withinSize(f: File) {
        return maxFileSize ? f.size <= maxFileSize : true;
      }

      const sized = accepted.filter(withinSize);

      if (accepted.length > 0 && sized.length === 0) {
        onError?.({
          code: 'max_file_size',
          message: 'All files exceed the maximum size.',
        });

        return;
      }

      setItems((prev) => {
        const capacity = typeof maxFiles === 'number' ? Math.max(0, maxFiles - prev.length) : undefined;
        const capped = typeof capacity === 'number' ? sized.slice(0, capacity) : sized;

        if (typeof capacity === 'number' && sized.length > capacity) {
          onError?.({
            code: 'max_files',
            message: 'Too many files. Some were not added.',
          });
        }

        const next: (FileUIPart & { id: string })[] = [];

        for (const file of capped) {
          next.push({
            filename: file.name,
            id: nanoid(),
            mediaType: file.type,
            type: 'file',
            url: URL.createObjectURL(file),
          });
        }

        return prev.concat(next);
      });
    },
    [matchesAccept, maxFiles, maxFileSize, onError]
  );

  const add = React.useMemo(() => {
    return usingProvider
      ? (files: File[] | FileList) => {
          return controller.attachments.add(files);
        }
      : addLocal;
  }, [usingProvider, controller, addLocal]);

  const remove = React.useMemo(() => {
    return usingProvider
      ? (id: string) => {
          return controller.attachments.remove(id);
        }
      : (id: string) => {
          return setItems((prev) => {
            const found = prev.find((file) => {
              return file.id === id;
            });

            if (found?.url) {
              URL.revokeObjectURL(found.url);
            }

            return prev.filter((file) => {
              return file.id !== id;
            });
          });
        };
  }, [usingProvider, controller]);

  const clear = React.useMemo(() => {
    return usingProvider
      ? () => {
          return controller.attachments.clear();
        }
      : () => {
          return setItems((prev) => {
            for (const file of prev) {
              if (file.url) {
                URL.revokeObjectURL(file.url);
              }
            }

            return [];
          });
        };
  }, [usingProvider, controller]);

  const openFileDialog = React.useMemo(() => {
    return usingProvider
      ? () => {
          return controller.attachments.openFileDialog();
        }
      : openFileDialogLocal;
  }, [usingProvider, controller, openFileDialogLocal]);

  // Let provider know about our hidden file input so external menus can call openFileDialog()
  React.useEffect(() => {
    if (!usingProvider) {
      return;
    }

    controller.__registerFileInput(inputRef, () => {
      return inputRef.current?.click();
    });
  }, [usingProvider, controller]);

  // Note: File input cannot be programmatically set for security reasons
  // The hasSyncHiddenInput prop is no longer functional
  React.useEffect(() => {
    if (hasSyncHiddenInput && inputRef.current && files.length === 0) {
      inputRef.current.value = '';
    }
  }, [files, hasSyncHiddenInput]);

  // Attach drop handlers on nearest form and document (opt-in)
  React.useEffect(() => {
    const form = formRef.current;

    if (!form) {
      return;
    }

    function onDragOver(e: DragEvent) {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
    }

    function onDrop(e: DragEvent) {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        add(e.dataTransfer.files);
      }
    }

    form.addEventListener('dragover', onDragOver);
    form.addEventListener('drop', onDrop);

    return () => {
      form.removeEventListener('dragover', onDragOver);
      form.removeEventListener('drop', onDrop);
    };
  }, [add]);

  React.useEffect(() => {
    if (!hasGlobalDrop) {
      return;
    }

    function onDragOverGlobal(e: DragEvent) {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
    }

    function onDropGlobal(e: DragEvent) {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        add(e.dataTransfer.files);
      }
    }

    document.addEventListener('dragover', onDragOverGlobal);
    document.addEventListener('drop', onDropGlobal);

    return () => {
      document.removeEventListener('dragover', onDragOverGlobal);
      document.removeEventListener('drop', onDropGlobal);
    };
  }, [add, hasGlobalDrop]);

  React.useEffect(() => {
    return () => {
      if (!usingProvider) {
        for (const f of files) {
          if (f.url) {
            URL.revokeObjectURL(f.url);
          }
        }
      }
    };
  }, [usingProvider, files]);

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.currentTarget.files) {
      add(event.currentTarget.files);
    }
  };

  async function convertBlobUrlToDataUrl(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        return resolve(reader.result as string);
      };

      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const ctx = React.useMemo<AttachmentsContext>(() => {
    return {
      add,
      clear,
      fileInputRef: inputRef,
      openFileDialog,
      remove,
      files: files.map((item) => {
        return { ...item, id: item.id };
      }),
    };
  }, [files, add, remove, clear, openFileDialog]);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const text = usingProvider
      ? controller.textInput.value
      : (() => {
          const formData = new FormData(form);

          return (formData.get('message') as string) || '';
        })();

    // Reset form immediately after capturing text to avoid race condition
    // where user input during async blob conversion would be lost
    if (!usingProvider) {
      form.reset();
    }

    // Convert blob URLs to data URLs asynchronously
    Promise.all(
      files.map(async ({ id: _id, ...item }) => {
        if (item.url && item.url.startsWith('blob:')) {
          return {
            ...item,
            url: await convertBlobUrlToDataUrl(item.url),
          };
        }

        return item;
      })
    ).then((convertedFiles: FileUIPart[]) => {
      try {
        const result = onSubmit({ files: convertedFiles, text }, event);

        // Handle both sync and async onSubmit
        if (result instanceof Promise) {
          result
            .then(() => {
              clear();

              if (usingProvider) {
                controller.textInput.clear();
              }
            })
            .catch(() => {
              // Don't clear on error - user may want to retry
            });
        } else {
          // Sync function completed without throwing, clear attachments
          clear();

          if (usingProvider) {
            controller.textInput.clear();
          }
        }
      } catch {
        // Don't clear on error - user may want to retry
      }
    });
  };

  // Render with or without local provider
  const inner = (
    <>
      <span ref={anchorRef} aria-hidden="true" className="hidden" />
      <input
        type="file"
        ref={inputRef}
        accept={accept}
        className="hidden"
        title="Upload files"
        multiple={isMultiple}
        onChange={handleChange}
        aria-label="Upload files"
      />
      <form onSubmit={handleSubmit} className={cn('w-full', className)} {...props}>
        <InputGroup className="overflow-hidden">{children}</InputGroup>
      </form>
    </>
  );

  return usingProvider ? (
    inner
  ) : (
    <LocalAttachmentsContext.Provider value={ctx}>{inner}</LocalAttachmentsContext.Provider>
  );
}

export type PromptInputBodyProps = HTMLAttributes<HTMLDivElement>;

export function PromptInputBody({ className, ...props }: PromptInputBodyProps) {
  return <div className={cn('contents', className)} {...props} />;
}

export type PromptInputTextareaProps = ComponentProps<typeof InputGroupTextarea>;

export function PromptInputTextarea({
  className,
  onChange,
  placeholder = 'What would you like to know?',
  ...props
}: PromptInputTextareaProps) {
  const controller = useOptionalPromptInputController();
  const attachments = usePromptInputAttachments();
  const [isComposing, setIsComposing] = React.useState(false);

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter') {
      if (isComposing || e.nativeEvent.isComposing) {
        return;
      }

      if (e.shiftKey) {
        return;
      }

      e.preventDefault();

      // Check if the submit button is disabled before submitting
      const form = e.currentTarget.form;
      const submitButton = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;

      if (submitButton?.disabled) {
        return;
      }

      form?.requestSubmit();
    }

    // Remove last attachment when Backspace is pressed and textarea is empty
    if (e.key === 'Backspace' && e.currentTarget.value === '' && attachments.files.length > 0) {
      e.preventDefault();
      const lastAttachment = attachments.files.at(-1);

      if (lastAttachment) {
        attachments.remove(lastAttachment.id);
      }
    }
  };

  const handlePaste: ClipboardEventHandler<HTMLTextAreaElement> = (event) => {
    const items = event.clipboardData?.items;

    if (!items) {
      return;
    }

    const files: File[] = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();

        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      event.preventDefault();
      attachments.add(files);
    }
  };

  const controlledProps = controller
    ? {
        value: controller.textInput.value,
        onChange: (e: ChangeEvent<HTMLTextAreaElement>) => {
          controller.textInput.setInput(e.currentTarget.value);
          onChange?.(e);
        },
      }
    : {
        onChange,
      };

  return (
    <InputGroupTextarea
      name="message"
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={cn('field-sizing-content max-h-48 min-h-16', className)}
      onCompositionEnd={() => {
        return setIsComposing(false);
      }}
      onCompositionStart={() => {
        return setIsComposing(true);
      }}
      {...props}
      {...controlledProps}
    />
  );
}

export type PromptInputHeaderProps = Omit<ComponentProps<typeof InputGroupAddon>, 'align'>;

export function PromptInputHeader({ className, ...props }: PromptInputHeaderProps) {
  return <InputGroupAddon align="block-end" className={cn('order-first flex-wrap gap-1', className)} {...props} />;
}

export type PromptInputFooterProps = Omit<ComponentProps<typeof InputGroupAddon>, 'align'>;

export function PromptInputFooter({ className, ...props }: PromptInputFooterProps) {
  return <InputGroupAddon align="block-end" className={cn('justify-between gap-1', className)} {...props} />;
}

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;

export function PromptInputTools({ className, ...props }: PromptInputToolsProps) {
  return <div className={cn('flex items-center gap-1', className)} {...props} />;
}

export type PromptInputButtonProps = ComponentProps<typeof InputGroupButton>;

export function PromptInputButton({ className, size, variant = 'ghost', ...props }: PromptInputButtonProps) {
  const newSize = size ?? (React.Children.count(props.children) > 1 ? 'sm' : 'icon-sm');

  return <InputGroupButton type="button" size={newSize} variant={variant} className={cn(className)} {...props} />;
}

export type PromptInputActionMenuProps = ComponentProps<typeof DropdownMenu>;

export function PromptInputActionMenu(props: PromptInputActionMenuProps) {
  return <DropdownMenu {...props} />;
}

export type PromptInputActionMenuTriggerProps = PromptInputButtonProps;

export function PromptInputActionMenuTrigger({ children, className, ...props }: PromptInputActionMenuTriggerProps) {
  return (
    <DropdownMenuTrigger asChild>
      <PromptInputButton className={className} {...props}>
        {children ?? <PlusIcon className="size-4" />}
      </PromptInputButton>
    </DropdownMenuTrigger>
  );
}

export type PromptInputActionMenuContentProps = ComponentProps<typeof DropdownMenuContent>;

export function PromptInputActionMenuContent({ className, ...props }: PromptInputActionMenuContentProps) {
  return <DropdownMenuContent align="start" className={cn(className)} {...props} />;
}

export type PromptInputActionMenuItemProps = ComponentProps<typeof DropdownMenuItem>;

export function PromptInputActionMenuItem({ className, ...props }: PromptInputActionMenuItemProps) {
  return <DropdownMenuItem className={cn(className)} {...props} />;
}

// Note: Actions that perform side-effects (like opening a file dialog)
// are provided in opt-in modules (e.g., prompt-input-attachments).

export type PromptInputSubmitProps = ComponentProps<typeof InputGroupButton> & {
  status?: ChatStatus;
};

export function PromptInputSubmit({
  children,
  className,
  size = 'icon-sm',
  status,
  variant = 'default',
  ...props
}: PromptInputSubmitProps) {
  let Icon = <CornerDownLeftIcon className="size-4" />;

  if (status === 'submitted') {
    Icon = <Loader2Icon className="size-4 animate-spin" />;
  } else if (status === 'streaming') {
    Icon = <SquareIcon className="size-4" />;
  } else if (status === 'error') {
    Icon = <XIcon className="size-4" />;
  }

  return (
    <InputGroupButton
      size={size}
      type="submit"
      variant={variant}
      aria-label="Submit"
      className={cn(className)}
      {...props}
    >
      {children ?? Icon}
    </InputGroupButton>
  );
}

type SpeechRecognition = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
};

type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionResultList = {
  [index: number]: SpeechRecognitionResult;
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
};

type SpeechRecognitionAlternative = {
  confidence: number;
  transcript: string;
};

type SpeechRecognitionErrorEvent = {
  error: string;
} & Event;

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

export type PromptInputSpeechButtonProps = ComponentProps<typeof PromptInputButton> & {
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  onTranscriptionChange?: (text: string) => void;
};

export function PromptInputSpeechButton({
  className,
  onTranscriptionChange,
  textareaRef,
  ...props
}: PromptInputSpeechButtonProps) {
  const [isListening, setIsListening] = React.useState(false);
  const [recognition, setRecognition] = React.useState<SpeechRecognition | null>(null);
  const recognitionRef = React.useRef<SpeechRecognition | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const speechRecognition = new SpeechRecognition();

      speechRecognition.continuous = true;
      speechRecognition.interimResults = true;
      speechRecognition.lang = 'en-US';

      speechRecognition.onstart = () => {
        setIsListening(true);
      };

      speechRecognition.onend = () => {
        setIsListening(false);
      };

      speechRecognition.onresult = (event) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];

          if (result.isFinal) {
            finalTranscript += result[0]?.transcript ?? '';
          }
        }

        if (finalTranscript && textareaRef?.current) {
          const textarea = textareaRef.current;
          const currentValue = textarea.value;
          const newValue = currentValue + (currentValue ? ' ' : '') + finalTranscript;

          textarea.value = newValue;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          onTranscriptionChange?.(newValue);
        }
      };

      speechRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current = speechRecognition;
      setRecognition(speechRecognition);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [textareaRef, onTranscriptionChange]);

  const toggleListening = React.useCallback(() => {
    if (!recognition) {
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }, [recognition, isListening]);

  return (
    <PromptInputButton
      disabled={!recognition}
      onClick={toggleListening}
      className={cn(
        'relative transition-all duration-200',
        isListening && 'bg-accent text-accent-foreground animate-pulse',
        className
      )}
      {...props}
    >
      <MicIcon className="size-4" />
    </PromptInputButton>
  );
}

export type PromptInputSelectProps = ComponentProps<typeof Select>;

export function PromptInputSelect(props: PromptInputSelectProps) {
  return <Select {...props} />;
}

export type PromptInputSelectTriggerProps = ComponentProps<typeof SelectTrigger>;

export function PromptInputSelectTrigger({ className, ...props }: PromptInputSelectTriggerProps) {
  return (
    <SelectTrigger
      className={cn(
        'text-muted-foreground border-none bg-transparent font-medium shadow-none transition-colors',
        'hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground',
        className
      )}
      {...props}
    />
  );
}

export type PromptInputSelectContentProps = ComponentProps<typeof SelectContent>;

export function PromptInputSelectContent({ className, ...props }: PromptInputSelectContentProps) {
  return <SelectContent className={cn(className)} {...props} />;
}

export type PromptInputSelectItemProps = ComponentProps<typeof SelectItem>;

export function PromptInputSelectItem({ className, ...props }: PromptInputSelectItemProps) {
  return <SelectItem className={cn(className)} {...props} />;
}

export type PromptInputSelectValueProps = ComponentProps<typeof SelectValue>;

export function PromptInputSelectValue({ className, ...props }: PromptInputSelectValueProps) {
  return <SelectValue className={cn(className)} {...props} />;
}

export type PromptInputHoverCardProps = ComponentProps<typeof HoverCard>;

export function PromptInputHoverCard({ closeDelay = 0, openDelay = 0, ...props }: PromptInputHoverCardProps) {
  return <HoverCard openDelay={openDelay} closeDelay={closeDelay} {...props} />;
}

export type PromptInputHoverCardTriggerProps = ComponentProps<typeof HoverCardTrigger>;

export function PromptInputHoverCardTrigger(props: PromptInputHoverCardTriggerProps) {
  return <HoverCardTrigger {...props} />;
}

export type PromptInputHoverCardContentProps = ComponentProps<typeof HoverCardContent>;

export function PromptInputHoverCardContent({ align = 'start', ...props }: PromptInputHoverCardContentProps) {
  return <HoverCardContent align={align} {...props} />;
}

export type PromptInputTabsListProps = HTMLAttributes<HTMLDivElement>;

export function PromptInputTabsList({ className, ...props }: PromptInputTabsListProps) {
  return <div className={cn(className)} {...props} />;
}

export type PromptInputTabProps = HTMLAttributes<HTMLDivElement>;

export function PromptInputTab({ className, ...props }: PromptInputTabProps) {
  return <div className={cn(className)} {...props} />;
}

export type PromptInputTabLabelProps = HTMLAttributes<HTMLHeadingElement>;

export function PromptInputTabLabel({ className, ...props }: PromptInputTabLabelProps) {
  return <h3 className={cn('text-muted-foreground mb-2 px-3 text-xs font-medium', className)} {...props} />;
}

export type PromptInputTabBodyProps = HTMLAttributes<HTMLDivElement>;

export function PromptInputTabBody({ className, ...props }: PromptInputTabBodyProps) {
  return <div className={cn('space-y-1', className)} {...props} />;
}

export type PromptInputTabItemProps = HTMLAttributes<HTMLDivElement>;

export function PromptInputTabItem({ className, ...props }: PromptInputTabItemProps) {
  return <div className={cn('hover:bg-accent flex items-center gap-2 px-3 py-2 text-xs', className)} {...props} />;
}

export type PromptInputCommandProps = ComponentProps<typeof Command>;

export function PromptInputCommand({ className, ...props }: PromptInputCommandProps) {
  return <Command className={cn(className)} {...props} />;
}

export type PromptInputCommandInputProps = ComponentProps<typeof CommandInput>;

export function PromptInputCommandInput({ className, ...props }: PromptInputCommandInputProps) {
  return <CommandInput className={cn(className)} {...props} />;
}

export type PromptInputCommandListProps = ComponentProps<typeof CommandList>;

export function PromptInputCommandList({ className, ...props }: PromptInputCommandListProps) {
  return <CommandList className={cn(className)} {...props} />;
}

export type PromptInputCommandEmptyProps = ComponentProps<typeof CommandEmpty>;

export function PromptInputCommandEmpty({ className, ...props }: PromptInputCommandEmptyProps) {
  return <CommandEmpty className={cn(className)} {...props} />;
}

export type PromptInputCommandGroupProps = ComponentProps<typeof CommandGroup>;

export function PromptInputCommandGroup({ className, ...props }: PromptInputCommandGroupProps) {
  return <CommandGroup className={cn(className)} {...props} />;
}

export type PromptInputCommandItemProps = ComponentProps<typeof CommandItem>;

export function PromptInputCommandItem({ className, ...props }: PromptInputCommandItemProps) {
  return <CommandItem className={cn(className)} {...props} />;
}

export type PromptInputCommandSeparatorProps = ComponentProps<typeof CommandSeparator>;

export function PromptInputCommandSeparator({ className, ...props }: PromptInputCommandSeparatorProps) {
  return <CommandSeparator className={cn(className)} {...props} />;
}
