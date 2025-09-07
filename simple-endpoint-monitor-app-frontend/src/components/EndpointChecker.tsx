import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Loader2, RefreshCw, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EndpointResult {
  url: string;
  result: string;
  status: number;
  time: number;
}

const EndpointChecker = () => {
  const [results, setResults] = useState<EndpointResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const ITEMS_PER_PAGE = 20;

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return results.slice(startIndex, endIndex);
  }, [results, currentPage]);

  const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);

  // Process large datasets in chunks to prevent UI blocking
  const processDataInChunks = useCallback(async (data: EndpointResult[]) => {
    setIsProcessing(true);
    const CHUNK_SIZE = 50;
    const chunks = [];
    
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      chunks.push(data.slice(i, i + CHUNK_SIZE));
    }
    
    let processedResults: EndpointResult[] = [];
    
    for (const chunk of chunks) {
      processedResults = [...processedResults, ...chunk];
      setResults([...processedResults]); // Update state with processed chunks
      
      // Allow UI to update between chunks
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    setIsProcessing(false);
  }, []);

  const checkEndpoints = async () => {
    setIsLoading(true);
    setIsProcessing(false);
    try {
      // Your API endpoint
      // const apiUrl = 'http://192.168.1.100:9091/check-endpoints';
      const apiUrl = 'https://endpoint-monitor-api.arindamgb.com/check-endpoints';
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Reset to first page when new data loads
      setCurrentPage(1);
      
      // Process large datasets in chunks
      if (data.length > 50) {
        await processDataInChunks(data);
      } else {
        setResults(data);
      }
      
      toast({
        title: "Success",
        description: `Checked ${data.length} endpoints successfully`,
      });
    } catch (error) {
      console.error('Error checking endpoints:', error);
      
      toast({
        title: "Error",
        description: "Failed to fetch endpoint data. Please check your API endpoint.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = useCallback((result: string, status: number) => {
    if (result === "UP" && status === 200) {
      return <Badge className="bg-success text-success-foreground">UP</Badge>;
    } else if (result === "DOWN" || status >= 400) {
      return <Badge className="bg-error text-error-foreground">DOWN</Badge>;
    } else {
      return <Badge className="bg-warning text-warning-foreground">UNKNOWN</Badge>;
    }
  }, []);

  const getResponseTimeColor = (time: number) => {
    if (time < 1) return "text-success";
    if (time < 3) return "text-warning";
    return "text-error";
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Activity className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Endpoint Monitor
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Monitor your API endpoints in real-time. Check the health and response times of your services with a single click.
        </p>
      </div>

      {/* Check Button */}
      <div className="flex justify-center">
        <Button 
          onClick={checkEndpoints} 
          disabled={isLoading || isProcessing}
          size="lg"
          className="min-w-[200px] h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Checking...
            </>
          ) : isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-5 w-5" />
              Check Endpoints
            </>
          )}
        </Button>
      </div>

      {/* Results Table */}
      {results.length > 0 && (
        <Card className="shadow-lg border-0" style={{ boxShadow: 'var(--card-shadow)' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Endpoint Status Results
            </CardTitle>
            <CardDescription>
              Last checked: {new Date().toLocaleString()} 
              {isProcessing && <span className="text-warning ml-2">(Processing large dataset...)</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Endpoint URL</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">HTTP Code</TableHead>
                  <TableHead className="font-semibold text-right">Response Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedResults.map((result, index) => (
                  <TableRow key={index} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-sm max-w-xs truncate" title={result.url}>
                      {result.url}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(result.result, result.status)}
                    </TableCell>
                    <TableCell>
                      <span className={`font-semibold ${result.status === 200 ? 'text-success' : 'text-error'}`}>
                        {result.status ?? 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${result.time ? getResponseTimeColor(result.time) : 'text-muted-foreground'}`}>
                        {result.time ? `${result.time.toFixed(2)}s` : 'N/A'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, results.length)} of {results.length} endpoints
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {(() => {
                      const maxVisiblePages = 5;
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                      
                      // Adjust startPage if we're near the end
                      if (endPage - startPage < maxVisiblePages - 1) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }
                      
                      return Array.from({ length: endPage - startPage + 1 }, (_, i) => {
                        const pageNumber = startPage + i;
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNumber)}
                              isActive={currentPage === pageNumber}
                              className="cursor-pointer"
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      });
                    })()}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {results.length === 0 && !isLoading && (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <Activity className="h-16 w-16 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-xl font-semibold mb-2">No Results Yet</h3>
              <p className="text-muted-foreground">
                Click the "Check Endpoints" button to start monitoring your API endpoints.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EndpointChecker;