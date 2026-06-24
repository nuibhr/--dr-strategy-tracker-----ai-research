import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AddPositionDialogProps {
  portfolioId: number;
  onPositionAdded: () => void;
  onSubmit: (data: any) => Promise<void>;
  isLoading: boolean;
  onSuccess?: () => void;
}

export function AddPositionDialog({ portfolioId, onPositionAdded, onSubmit, isLoading }: AddPositionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    ticker: "",
    drName: "",
    companyName: "",
    entryPrice: "",
    entryPriceUSD: "",
    stopLoss: "",
    takeProfit: "",
    currentPrice: "",
    currentPriceUSD: "",
    quantity: "1",
    news: "",
    outlook: "",
    support: "",
    resistance: "",
    ratio: "1",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.ticker.trim()) {
      toast.error("Ticker is required");
      return;
    }
    if (!formData.drName.trim()) {
      toast.error("DR Name is required");
      return;
    }
    if (!formData.entryPrice.trim()) {
      toast.error("Entry Price is required");
      return;
    }
    if (!formData.stopLoss.trim()) {
      toast.error("Stop Loss is required");
      return;
    }
    if (!formData.takeProfit.trim()) {
      toast.error("Take Profit is required");
      return;
    }

    try {
      await onSubmit({
        portfolioId,
        ...formData,
      });
      setFormData({
        ticker: "",
        drName: "",
        companyName: "",
        entryPrice: "",
        entryPriceUSD: "",
        stopLoss: "",
        takeProfit: "",
        currentPrice: "",
        currentPriceUSD: "",
        quantity: "1",
        news: "",
        outlook: "",
        support: "",
        resistance: "",
        ratio: "1",
      });
      setIsOpen(false);
      onPositionAdded();
    } catch (error) {
      console.error("Error adding position:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4" />
          Add Position
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Position</DialogTitle>
          <DialogDescription className="text-slate-400">
            Add a new DR stock position to your portfolio
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stock Information */}
          <div className="space-y-3 border-b border-slate-700 pb-4">
            <h3 className="text-sm font-semibold text-white">Stock Information</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ticker" className="text-slate-300">Ticker *</Label>
                <Input
                  id="ticker"
                  placeholder="e.g., ASTS03"
                  value={formData.ticker}
                  onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drName" className="text-slate-300">DR Name *</Label>
                <Input
                  id="drName"
                  placeholder="e.g., AST SpaceMobile"
                  value={formData.drName}
                  onChange={(e) => setFormData({ ...formData, drName: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-slate-300">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Full company name"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-3 border-b border-slate-700 pb-4">
            <h3 className="text-sm font-semibold text-white">Pricing</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="entryPrice" className="text-slate-300">Entry Price (THB) *</Label>
                <Input
                  id="entryPrice"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 78.50"
                  value={formData.entryPrice}
                  onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entryPriceUSD" className="text-slate-300">Entry Price (USD)</Label>
                <Input
                  id="entryPriceUSD"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 87.57"
                  value={formData.entryPriceUSD}
                  onChange={(e) => setFormData({ ...formData, entryPriceUSD: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="currentPrice" className="text-slate-300">Current Price (THB)</Label>
                <Input
                  id="currentPrice"
                  type="number"
                  step="0.01"
                  placeholder="Leave empty to use entry price"
                  value={formData.currentPrice}
                  onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentPriceUSD" className="text-slate-300">Current Price (USD)</Label>
                <Input
                  id="currentPriceUSD"
                  type="number"
                  step="0.01"
                  placeholder="Leave empty to use entry price"
                  value={formData.currentPriceUSD}
                  onChange={(e) => setFormData({ ...formData, currentPriceUSD: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          </div>

          {/* Risk Management */}
          <div className="space-y-3 border-b border-slate-700 pb-4">
            <h3 className="text-sm font-semibold text-white">Risk Management</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="stopLoss" className="text-slate-300">Stop Loss (THB) *</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 76.00"
                  value={formData.stopLoss}
                  onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="takeProfit" className="text-slate-300">Take Profit (THB) *</Label>
                <Input
                  id="takeProfit"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 95.00"
                  value={formData.takeProfit}
                  onChange={(e) => setFormData({ ...formData, takeProfit: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="support" className="text-slate-300">Support (THB)</Label>
                <Input
                  id="support"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 75.00"
                  value={formData.support}
                  onChange={(e) => setFormData({ ...formData, support: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resistance" className="text-slate-300">Resistance (THB)</Label>
                <Input
                  id="resistance"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 100.00"
                  value={formData.resistance}
                  onChange={(e) => setFormData({ ...formData, resistance: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-slate-300">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="e.g., 100"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ratio" className="text-slate-300">DR Ratio</Label>
                <Input
                  id="ratio"
                  placeholder="e.g., 1:1"
                  value={formData.ratio}
                  onChange={(e) => setFormData({ ...formData, ratio: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Additional Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="news" className="text-slate-300">News/Catalyst</Label>
              <Textarea
                id="news"
                placeholder="e.g., New product launch, earnings beat"
                value={formData.news}
                onChange={(e) => setFormData({ ...formData, news: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white h-20 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outlook" className="text-slate-300">Outlook</Label>
              <Textarea
                id="outlook"
                placeholder="e.g., Bullish on AI infrastructure growth"
                value={formData.outlook}
                onChange={(e) => setFormData({ ...formData, outlook: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white h-20 resize-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1 border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Adding..." : "Add Position"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
