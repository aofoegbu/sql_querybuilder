import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertSavedQuerySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize mock data on startup
  await storage.generateMockData();

  // Execute SQL query
  app.post("/api/queries/execute", async (req, res) => {
    try {
      const { sqlQuery } = req.body;
      
      if (!sqlQuery || typeof sqlQuery !== "string") {
        return res.status(400).json({ message: "SQL query is required" });
      }

      const result = await storage.executeQuery(sqlQuery);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all saved queries
  app.get("/api/queries/saved", async (req, res) => {
    try {
      const queries = await storage.getSavedQueries();
      res.json(queries);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get a specific saved query
  app.get("/api/queries/saved/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const query = await storage.getSavedQuery(id);
      
      if (!query) {
        return res.status(404).json({ message: "Query not found" });
      }
      
      res.json(query);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create a saved query
  app.post("/api/queries/saved", async (req, res) => {
    try {
      const validatedData = insertSavedQuerySchema.parse(req.body);
      const query = await storage.createSavedQuery(validatedData);
      res.status(201).json(query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Update a saved query
  app.put("/api/queries/saved/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSavedQuerySchema.partial().parse(req.body);
      const query = await storage.updateSavedQuery(id, validatedData);
      res.json(query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a saved query
  app.delete("/api/queries/saved/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSavedQuery(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get database schema information
  app.get("/api/schema", async (req, res) => {
    try {
      const schemas = await storage.getTableSchemas();
      res.json(schemas);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export query results
  app.post("/api/queries/export", async (req, res) => {
    try {
      const { sqlQuery, format } = req.body;
      
      if (!sqlQuery || !format) {
        return res.status(400).json({ message: "SQL query and format are required" });
      }

      const result = await storage.executeQuery(sqlQuery);
      
      switch (format.toLowerCase()) {
        case 'csv':
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename="query_results.csv"');
          
          // Generate CSV
          const csvHeader = result.columns.join(',');
          const csvRows = result.rows.map(row => 
            row.map(cell => {
              if (cell === null || cell === undefined) return '';
              const cellStr = String(cell);
              return cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') 
                ? `"${cellStr.replace(/"/g, '""')}"` 
                : cellStr;
            }).join(',')
          );
          const csv = [csvHeader, ...csvRows].join('\n');
          res.send(csv);
          break;
          
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', 'attachment; filename="query_results.json"');
          
          // Convert rows to objects
          const jsonData = result.rows.map(row => {
            const obj: any = {};
            result.columns.forEach((col, index) => {
              obj[col] = row[index];
            });
            return obj;
          });
          res.json(jsonData);
          break;
          
        default:
          res.status(400).json({ message: "Unsupported export format" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
