import chalk from "chalk";
import { EOL } from "os";

import { ResultStatus } from "..";
import { ProcessLogger } from "../logging/logger";
import { getQuickErrorSummary } from "../shared/errors";

import { initializeJavaScript } from "./initializeJavaScript";
import { initializeProject } from "./initializeProject";
import { InitializationPurpose, initializePurpose } from "./initializePurpose";
import { initializeTypeScript } from "./initializeTypeScript";

const fileName = "typestat.json";

export type InitializationResults = FailedInitialization | RanInitializationResults;

export interface FailedInitialization {
    status: ResultStatus.ConfigurationError;
}

export interface RanInitializationResults {
    status: ResultStatus.Failed | ResultStatus.Succeeded;
    skipped: boolean;
}

export const initialization = async (logger: ProcessLogger): Promise<InitializationResults> => {
    logger.stdout.write(chalk.greenBright("👋"));
    logger.stdout.write(chalk.green(" Welcome to TypeStat! "));
    logger.stdout.write(chalk.greenBright("👋"));
    logger.stdout.write(chalk.reset(EOL));

    logger.stdout.write(chalk.reset(`This will create a new `));
    logger.stdout.write(chalk.yellowBright(fileName));
    logger.stdout.write(chalk.reset(` for you.${EOL}`));
    logger.stdout.write(`If you don't know how to answer, that's ok - just select the default answer.${EOL}`);
    logger.stdout.write(chalk.reset(EOL));

    let skipped: boolean;

    try {
        skipped = await runPrompts();
    } catch (error) {
        logger.stderr.write(getQuickErrorSummary(error));
        return {
            status: ResultStatus.ConfigurationError,
        };
    }

    if (!skipped) {
        logger.stdout.write(chalk.reset(`${EOL}Awesome! You're now ready to:${EOL}`));
        logger.stdout.write(chalk.greenBright(`typestat --config ${fileName}`));
        logger.stdout.write(chalk.reset(`${EOL}${EOL}Once you run that, TypeStat will start auto-fixing your typings.${EOL}`));
        logger.stdout.write(chalk.yellow(`Please report any bugs on https://github.com/JoshuaKGoldberg/TypeStat! `));
        logger.stdout.write(chalk.yellowBright("💖"));
    }

    logger.stdout.write(chalk.reset(EOL));

    return {
        skipped,
        status: ResultStatus.Succeeded,
    };
};

const runPrompts = async () => {
    const purpose = await initializePurpose();
    if (purpose === InitializationPurpose.Skipped) {
        return true;
    }

    const project = await initializeProject();
    await (purpose === InitializationPurpose.ConvertJavaScript ? initializeJavaScript : initializeTypeScript)({ fileName, project });

    return false;
};