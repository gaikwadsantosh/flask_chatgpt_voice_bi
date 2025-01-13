CREATE TABLE ServiceRecords (
    [Date] DATE NOT NULL,                       -- Service date
    [Job#] INT NOT NULL,                        -- Unique job identifier
    [CustomerName] NVARCHAR(100) NOT NULL,      -- Name of the customer
    [VehicleType] NVARCHAR(50) NOT NULL,        -- Type of vehicle
    [Parts] FLOAT NOT NULL,                    -- Cost of parts used
    [Labor] FLOAT NOT NULL,                    -- Labor cost
    [BillableHours] FLOAT NOT NULL,             -- Total billable hours
    [TechnicianName] NVARCHAR(100) NOT NULL,    -- Name of the technician
    [CustomerSatisfactionRating] INT NOT NULL   -- Rating given by the customer (e.g., 1-10)
);
