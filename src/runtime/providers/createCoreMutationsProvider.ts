import { Mutation, MutationsWave } from "automutate";
import chalk from "chalk";

import { TypeStatOptions } from "../../options/types";
import { LazyCache } from "../../services/LazyCache";
import { FileInfoCache } from "../../shared/FileInfoCache";
import { convertMapToObject } from "../../shared/maps";
import { NameGenerator } from "../../shared/NameGenerator";
import { collectFilteredNodes } from "../collectFilteredNodes";
import { createFileNamesAndServices } from "../createFileNamesAndServices";
import { findMutationsInFile } from "../findMutationsInFile";

/**
 * Creates a mutations provider that runs the core mutations within TypeStat.
 *
 * @param options   Parsed runtime options for TypeStat.
 * @param allModifiedFileNames   Set to mark names of all files that were modified.
 */
export const createCoreMutationsProvider = (options: TypeStatOptions, allModifiedFiles: Set<string>) => {
    const fileNamesAndServicesCache = createFileNamesAndServicesCache(options);
    let lastFileIndex = -1;

    return async (): Promise<MutationsWave> => {
        const startTime = Date.now();
        const fileMutations = new Map<string, ReadonlyArray<Mutation>>();
        const { fileNames, services } = fileNamesAndServicesCache.get();
        const waveStartedFromBeginning = lastFileIndex <= 0;
        let addedMutations = 0;

        for (lastFileIndex = lastFileIndex + 1; lastFileIndex < fileNames.length; lastFileIndex += 1) {
            const fileName = fileNames[lastFileIndex];

            const sourceFile = services.program.getSourceFile(fileName);
            if (sourceFile === undefined) {
                options.output.stderr(`Could not find TypeScript source file for '${fileName}'.`);
                continue;
            }

            const filteredNodes = collectFilteredNodes(options, sourceFile);
            const foundMutations = await findMutationsInFile({
                fileInfoCache: new FileInfoCache(filteredNodes, services, sourceFile),
                filteredNodes,
                nameGenerator: new NameGenerator(sourceFile.fileName),
                options,
                services,
                sourceFile,
            });

            if (foundMutations !== undefined && foundMutations.length !== 0) {
                addedMutations += foundMutations.length;
                fileMutations.set(fileName, foundMutations);
            }

            if (addedMutations > 100 || (addedMutations !== 0 && Date.now() - startTime > 10000)) {
                break;
            }
        }

        if (lastFileIndex === fileNames.length) {
            lastFileIndex = -1;

            // Only recreate the language service once we've visited every file
            // This way we don't constantly re-scan many of the source files each wave
            // Eventually it would be nice to support incremental updates
            // See https://github.com/JoshuaKGoldberg/TypeStat/issues/36
            fileNamesAndServicesCache.clear();
        }

        for (const fileName of fileMutations.keys()) {
            allModifiedFiles.add(fileName);
        }

        return {
            fileMutations: waveStartedFromBeginning && fileMutations.size === 0 ? undefined : convertMapToObject(fileMutations),
        };
    };
};

const createFileNamesAndServicesCache = (options: TypeStatOptions) => {
    return new LazyCache(() => {
        options.output.stdout(chalk.grey("Preparing language services to visit files..."));

        const { fileNames, services } = createFileNamesAndServices(options);
        options.output.stdout(chalk.grey(`Prepared language services for ${fileNames.length} files...`));

        return { fileNames, services };
    });
};
