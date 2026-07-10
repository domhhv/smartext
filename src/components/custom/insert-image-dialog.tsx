'use client';

import { useUser } from '@clerk/nextjs';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import * as Sentry from '@sentry/nextjs';
import { ImageIcon, UploadIcon, LoaderCircleIcon } from 'lucide-react';
import Link from 'next/link';
import posthog from 'posthog-js';
import * as React from 'react';
import { toast } from 'sonner';

import { useDocument } from '@/components/providers/document-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogTitle, DialogFooter, DialogHeader, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import INSERT_IMAGE_COMMAND from '@/lib/constants/editor-insert-image-command';
import useClerkSupabaseClient from '@/lib/hooks/use-clerk-supabase-client';
import getErrorMessage from '@/lib/utils/get-error-message';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function isValidImageUrl(url: string) {
  try {
    const parsedUrl = new URL(url);

    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

type InsertImageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function InsertImageDialog({ onOpenChange, open }: InsertImageDialogProps) {
  const [editor] = useLexicalComposerContext();
  const { isSignedIn, user } = useUser();
  const { activeDocument } = useDocument();
  const supabase = useClerkSupabaseClient();
  const [url, setUrl] = React.useState('');
  const [altText, setAltText] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function resetState() {
    setUrl('');
    setAltText('');
    setFile(null);
    setIsUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetState();
    }

    onOpenChange(nextOpen);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      setFile(null);

      return;
    }

    if (!ALLOWED_IMAGE_TYPES[selectedFile.type]) {
      toast.error('Unsupported file type', {
        description: 'Please choose a PNG, JPEG, GIF or WebP image',
      });

      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error('File is too large', {
        description: 'The maximum allowed image size is 10 MB',
      });

      return;
    }

    setFile(selectedFile);
  }

  function handleUrlInsert() {
    if (!isValidImageUrl(url)) {
      toast.error('Invalid image URL', {
        description: 'Please enter a valid http(s) URL',
      });

      return;
    }

    editor.dispatchCommand(INSERT_IMAGE_COMMAND, { altText, src: url });
    posthog.capture('image_inserted_by_url');
    handleOpenChange(false);
  }

  async function handleUpload() {
    if (!file || !user || !activeDocument) {
      return;
    }

    try {
      setIsUploading(true);

      const extension = ALLOWED_IMAGE_TYPES[file.type];
      const path = `${user.id}/${activeDocument.id}/${crypto.randomUUID()}.${extension}`;

      const { error } = await supabase.storage.from('images').upload(path, file, {
        contentType: file.type,
      });

      if (error) {
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('images').getPublicUrl(path);

      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
        altText: altText || file.name,
        src: publicUrl,
      });

      posthog.capture('image_uploaded', { documentId: activeDocument.id });
      handleOpenChange(false);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error uploading image: ', error);
      toast.error('Error uploading image', {
        description: getErrorMessage(error),
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {open && (
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="url">
            <TabsList className="w-full">
              <TabsTrigger value="url">Paste URL</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  value={url}
                  id="image-url"
                  placeholder="https://example.com/image.png"
                  onChange={(event) => {
                    setUrl(event.target.value);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-url-alt">Alt text (optional)</Label>
                <Input
                  value={altText}
                  id="image-url-alt"
                  placeholder="Descriptive alternative text"
                  onChange={(event) => {
                    setAltText(event.target.value);
                  }}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button disabled={!url} onClick={handleUrlInsert}>
                  Insert
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4 pt-2">
              {!isSignedIn ? (
                <div className="space-y-4 py-4 text-center">
                  <ImageIcon className="text-muted-foreground mx-auto size-8" />
                  <p className="text-muted-foreground text-sm">
                    Uploading images is available to registered users. Log in to upload images directly to your
                    documents.
                  </p>
                  <Button asChild>
                    <Link href="/login">Log in</Link>
                  </Button>
                </div>
              ) : !activeDocument ? (
                <div className="space-y-4 py-4 text-center">
                  <ImageIcon className="text-muted-foreground mx-auto size-8" />
                  <p className="text-muted-foreground text-sm">
                    Save the document first to upload images. Uploaded images are stored alongside the document.
                  </p>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png,image/jpeg,image/gif,image/webp"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className="border-input hover:bg-accent hover:text-accent-foreground flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-10 text-center transition-colors"
                  >
                    {file ? (
                      <>
                        <ImageIcon className="text-muted-foreground size-6" />
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-muted-foreground text-xs">Click to choose a different image</span>
                      </>
                    ) : (
                      <>
                        <UploadIcon className="text-muted-foreground size-6" />
                        <span className="text-sm font-medium">Select an image</span>
                        <span className="text-muted-foreground text-xs">PNG, JPEG, GIF or WebP, up to 10 MB</span>
                      </>
                    )}
                  </button>
                  <div className="space-y-2">
                    <Label htmlFor="image-upload-alt">Alt text (optional)</Label>
                    <Input
                      value={altText}
                      id="image-upload-alt"
                      placeholder="Descriptive alternative text"
                      onChange={(event) => {
                        setAltText(event.target.value);
                      }}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      disabled={!file || isUploading}
                      onClick={() => {
                        void handleUpload();
                      }}
                    >
                      {isUploading && <LoaderCircleIcon className="mr-2 animate-spin" />}
                      Upload
                    </Button>
                  </DialogFooter>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      )}
    </Dialog>
  );
}
