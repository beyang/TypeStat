import { MutationsProvider } from "automutate";

import { TypeStatOptions } from "../options/types";

import { createProviderFromProviders } from "./createProviderFromProviders";
import { createCoreMutationsProvider } from "./providers/createCoreMutationsProvider";
import { createInstallMissingTypesProvider } from "./providers/createInstallMissingTypesProvider";
import { createMarkFilesModifiedProvider } from "./providers/createMarkFilesModifiedProvider";
import { createPostProcessingProvider } from "./providers/createPostProcessingProvider";
import { createRequireRenameProvider } from "./providers/createRequireRenameProvider";

/**
 * Creates a mutations provider that mutates files, then marks them as mutated.
 */
export const createTypeStatProvider = (options: TypeStatOptions): MutationsProvider => {
    const allModifiedFiles = new Set<string>();

    return {
        provide: createProviderFromProviders(
            createInstallMissingTypesProvider(options),
            createRequireRenameProvider(options, allModifiedFiles),
            createCoreMutationsProvider(options, allModifiedFiles),
            createMarkFilesModifiedProvider(options, allModifiedFiles),
            createPostProcessingProvider(options, allModifiedFiles),
        ),
    };
};
