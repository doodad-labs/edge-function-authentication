import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);

interface TableDefinition {
    name: string;
    columns: string[];
    constraints?: string[];
}

interface MigrationContent {
    tables: TableDefinition[];
    otherOperations: string[];
}

async function parseMigrationFile(filePath: string): Promise<MigrationContent> {
    const content = await readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    const result: MigrationContent = {
        tables: [],
        otherOperations: []
    };

    let currentTable: TableDefinition | null = null;

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Detect CREATE TABLE statements
        const createTableMatch = trimmedLine.match(/CREATE TABLE (?:IF NOT EXISTS )?["`]?([^"`]+)["`]?/i);
        if (createTableMatch) {
            currentTable = {
                name: createTableMatch[1],
                columns: [],
                constraints: []
            };
            continue;
        }

        // Detect column definitions (when inside a CREATE TABLE)
        if (currentTable && trimmedLine.match(/^["`]?[^"`]+["`]?\s+.+/)) {
            // Skip if it's a constraint that comes after columns
            if (trimmedLine.match(/^(PRIMARY KEY|FOREIGN KEY|CONSTRAINT|UNIQUE)\b/i)) {
                currentTable.constraints = currentTable.constraints || [];
                currentTable.constraints.push(trimmedLine.replace(/,$/, ''));
            } else {
                currentTable.columns.push(trimmedLine.replace(/,$/, ''));
            }
            continue;
        }

        // Detect end of CREATE TABLE
        if (currentTable && trimmedLine.match(/^\)/)) {
            result.tables.push(currentTable);
            currentTable = null;
            continue;
        }

        // Any other SQL statements
        if (!currentTable && trimmedLine) {
            result.otherOperations.push(trimmedLine);
        }
    }

    return result;
}

function generateLinearMigrations(originalMigrations: MigrationContent[]): string[] {
    const allTables: Record<string, TableDefinition> = {};
    const allOtherOperations: string[] = [];
    const linearMigrations: string[] = [];

    for (const migration of originalMigrations) {
        let migrationContent = '';

        // Process tables - only include new columns or changes
        for (const table of migration.tables) {
            if (!allTables[table.name]) {
                // New table - create it with all columns
                allTables[table.name] = { ...table };
                migrationContent += `CREATE TABLE ${table.name} (\n`;
                migrationContent += `  ${table.columns.join(',\n  ')}`;
                if (table.constraints?.length) {
                    migrationContent += `,\n  ${table.constraints.join(',\n  ')}`;
                }
                migrationContent += '\n);\n\n';
            } else {
                // Existing table - add new columns
                const existingTable = allTables[table.name];
                const newColumns = table.columns.filter(col => 
                    !existingTable.columns.some(exCol => {
                        const colName = col.split(/\s+/)[0].replace(/["`]/g, '');
                        const exColName = exCol.split(/\s+/)[0].replace(/["`]/g, '');
                        return colName === exColName;
                    })
                );

                if (newColumns.length > 0) {
                    for (const column of newColumns) {
                        migrationContent += `ALTER TABLE ${table.name} ADD COLUMN ${column};\n`;
                        existingTable.columns.push(column);
                    }
                    migrationContent += '\n';
                }

                // Add new constraints
                if (table.constraints) {
                    const newConstraints = table.constraints.filter(cons => 
                        !existingTable.constraints?.some(exCons => exCons === cons)
                    );

                    if (newConstraints.length > 0) {
                        for (const constraint of newConstraints) {
                            migrationContent += `ALTER TABLE ${table.name} ADD ${constraint};\n`;
                        }
                        existingTable.constraints = [
                            ...(existingTable.constraints || []),
                            ...newConstraints
                        ];
                        migrationContent += '\n';
                    }
                }
            }
        }

        // Process other operations (like CREATE INDEX, etc.)
        for (const operation of migration.otherOperations) {
            if (!allOtherOperations.includes(operation)) {
                migrationContent += `${operation}\n`;
                allOtherOperations.push(operation);
            }
        }

        if (migrationContent.trim()) {
            linearMigrations.push(migrationContent.trim());
        } else {
            // Empty migration (all operations were already included)
            linearMigrations.push('-- This migration contained no new operations');
        }
    }

    return linearMigrations;
}

async function processMigrations(inputDir: string, outputDir: string): Promise<void> {
    try {
        // Create output directory if it doesn't exist
        await mkdir(outputDir, { recursive: true });

        // Read and sort migration files
        const files = (await readdir(inputDir))
            .filter(file => file.endsWith('.sql'))
            .sort();

        console.log(`Found ${files.length} migration files to process`);

        // Parse all migrations
        const migrations: MigrationContent[] = [];
        for (const file of files) {
            const filePath = path.join(inputDir, file);
            console.log(`Processing ${file}...`);
            const content = await parseMigrationFile(filePath);
            migrations.push(content);
        }

        // Generate linear migrations
        const linearMigrations = generateLinearMigrations(migrations);

        // Write the new migrations
        for (let i = 0; i < linearMigrations.length; i++) {
            const newFileName = files[i];
            const newFilePath = path.join(outputDir, newFileName);
            await writeFile(newFilePath, linearMigrations[i]);
            console.log(`Created ${newFileName}`);
        }

        console.log('Successfully linearized all migrations!');
    } catch (error) {
        console.error('Error processing migrations:', error);
    }
}

// Usage example
const inputDirectory = './non_linear_migrations';
const outputDirectory = './migrations';

processMigrations(inputDirectory, outputDirectory);