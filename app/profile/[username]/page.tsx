"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { 
  UserPlus, 
  UserMinus, 
  UserCheck, 
  MessageSquare, 
  Trophy, 
  Target, 
  TrendingUp,
  Copy,
  Crosshair,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const usernameParam = params.username as string;

  const profile = useQuery(api.profile.getProfileByHandle, { handle: usernameParam });
  const currentUser = useQuery(api.users.getCurrentUser);
  const friendStatus = useQuery(
    api.friends.getFriendStatus,
    profile?.userId ? { friendId: profile.userId } : "skip"
  );
  const guestbookComments = useQuery(
    api.profile.getGuestbookComments,
    profile?.userId ? { profileUserId: profile.userId } : "skip"
  );

  const addFriend = useMutation(api.friends.sendFriendRequest);
  const acceptFriend = useMutation(api.friends.acceptFriendRequest);
  const removeFriend = useMutation(api.friends.removeFriend);
  const postComment = useMutation(api.profile.postGuestbookComment);

  const [newComment, setNewComment] = useState("");
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [isAcceptingFriend, setIsAcceptingFriend] = useState(false);
  const [isRemovingFriend, setIsRemovingFriend] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (profile === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
          <p className="text-zinc-400">This user does not exist.</p>
        </div>
      </div>
    );
  }

  const profileUser = profile.user;
  const isOwnProfile = currentUser?._id === profileUser._id;

  const onAddFriend = async () => {
    if (!profileUser || isAddingFriend) return;
    setIsAddingFriend(true);
    try {
      await addFriend({ friendId: profileUser._id });
      toast.success("Friend request sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send friend request");
    } finally {
      setIsAddingFriend(false);
    }
  };

  const onAcceptFriend = async () => {
    if (!profileUser || isAcceptingFriend) return;
    setIsAcceptingFriend(true);
    try {
      await acceptFriend({ friendId: profileUser._id });
      toast.success("Friend request accepted!");
    } catch (error: any) {
      toast.error(error.message || "Failed to accept friend request");
    } finally {
      setIsAcceptingFriend(false);
    }
  };

  const onRemoveFriend = async () => {
    if (!profileUser || isRemovingFriend) return;
    setIsRemovingFriend(true);
    try {
      await removeFriend({ friendId: profileUser._id });
      toast.success("Friend removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove friend");
    } finally {
      setIsRemovingFriend(false);
    }
  };

  const onPostComment = async () => {
    if (!newComment.trim() || !profileUser || isPostingComment) return;
    setIsPostingComment(true);
    try {
      await postComment({ profileUserId: profileUser._id, content: newComment.trim() });
      setNewComment("");
      toast.success("Comment posted!");
    } catch (error: any) {
      toast.error(error.message || "Failed to post comment");
    } finally {
      setIsPostingComment(false);
    }
  };

  const onCopyCrosshair = () => {
    if (!profile.crosshairCode) return;
    navigator.clipboard.writeText(profile.crosshairCode);
    toast.success("Crosshair code copied!");
  };

  useEffect(() => {
    if (!canvasRef.current || !profile.crosshairCode) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY);
    ctx.lineTo(centerX + 10, centerY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 10);
    ctx.lineTo(centerX, centerY + 10);
    ctx.stroke();

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#18181b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(centerX - 10, centerY);
      ctx.lineTo(centerX + 10, centerY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 10);
      ctx.lineTo(centerX, centerY + 10);
      ctx.stroke();

      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.stroke();
    };

    canvas.addEventListener("mousemove", onMouseMove);
    return () => canvas.removeEventListener("mousemove", onMouseMove);
  }, [profile.crosshairCode]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-3xl font-bold">
                {profileUser.nickname?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{profileUser.nickname || "Unknown"}</h1>
                <p className="text-zinc-400">Level {profile.level || 1}</p>
                <div className="flex gap-4 mt-2">
                  <div className="text-sm">
                    <span className="text-zinc-400">Wins:</span>{" "}
                    <span className="text-green-500 font-semibold">{profile.wins || 0}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-zinc-400">Losses:</span>{" "}
                    <span className="text-red-500 font-semibold">{profile.losses || 0}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-zinc-400">W/L:</span>{" "}
                    <span className="text-orange-500 font-semibold">
                      {profile.wins && profile.losses
                        ? (profile.wins / (profile.wins + profile.losses)).toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {!isOwnProfile && currentUser && (
              <div className="flex gap-2">
                {friendStatus === "none" && (
                  <Button
                    onClick={onAddFriend}
                    disabled={isAddingFriend}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isAddingFriend ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Friend
                      </>
                    )}
                  </Button>
                )}
                {friendStatus === "pending_received" && (
                  <Button
                    onClick={onAcceptFriend}
                    disabled={isAcceptingFriend}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isAcceptingFriend ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 mr-2" />
                        Accept Request
                      </>
                    )}
                  </Button>
                )}
                {friendStatus === "pending_sent" && (
                  <Button disabled className="bg-zinc-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Request Sent
                  </Button>
                )}
                {friendStatus === "friends" && (
                  <Button
                    onClick={onRemoveFriend}
                    disabled={isRemovingFriend}
                    variant="destructive"
                  >
                    {isRemovingFriend ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserMinus className="w-4 h-4 mr-2" />
                        Remove Friend
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="crosshair">Crosshair</TabsTrigger>
            <TabsTrigger value="guestbook">Guestbook</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-zinc-900 border-zinc-800 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold">Total Matches</h3>
                </div>
                <p className="text-3xl font-bold">{(profile.wins || 0) + (profile.losses || 0)}</p>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold">Win Rate</h3>
                </div>
                <p className="text-3xl font-bold">
                  {profile.wins && profile.losses
                    ? `${((profile.wins / (profile.wins + profile.losses)) * 100).toFixed(1)}%`
                    : "0%"}
                </p>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold">Level</h3>
                </div>
                <p className="text-3xl font-bold">{profile.level || 1}</p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <h3 className="text-xl font-bold mb-4">Detailed Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Total Wins</span>
                  <span className="text-green-500 font-semibold">{profile.wins || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Total Losses</span>
                  <span className="text-red-500 font-semibold">{profile.losses || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Win/Loss Ratio</span>
                  <span className="text-orange-500 font-semibold">
                    {profile.wins && profile.losses
                      ? (profile.wins / (profile.wins + profile.losses)).toFixed(2)
                      : "0.00"}
                  </span>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="crosshair" className="mt-6">
            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Crosshair className="w-5 h-5 text-orange-500" />
                  Crosshair Settings
                </h3>
                {profile.crosshairCode && (
                  <Button
                    onClick={onCopyCrosshair}
                    variant="outline"
                    size="sm"
                    className="border-zinc-700"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </Button>
                )}
              </div>

              {profile.crosshairCode ? (
                <div className="space-y-4">
                  <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={300}
                      className="w-full rounded"
                    />
                  </div>
                  <div className="bg-zinc-950 rounded p-3 border border-zinc-800">
                    <code className="text-sm text-green-400 break-all">
                      {profile.crosshairCode}
                    </code>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-400">No crosshair settings configured.</p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="guestbook" className="mt-6">
            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-500" />
                Guestbook
              </h3>

              {currentUser && !isOwnProfile && (
                <div className="mb-6">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Leave a comment..."
                    className="bg-zinc-950 border-zinc-800 mb-2"
                    rows={3}
                  />
                  <Button
                    onClick={onPostComment}
                    disabled={!newComment.trim() || isPostingComment}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isPostingComment ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <MessageSquare className="w-4 h-4 mr-2" />
                    )}
                    Post Comment
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                {guestbookComments && guestbookComments.length > 0 ? (
                  guestbookComments.map((comment) => (
                    <div
                      key={comment._id}
                      className="bg-zinc-950 rounded-lg p-4 border border-zinc-800"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-bold">
                          {comment.author.nickname?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-semibold">{comment.author.nickname || "Unknown"}</p>
                          <p className="text-xs text-zinc-500">
                            {new Date(comment._creationTime).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-zinc-300">{comment.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-400 text-center py-8">No comments yet.</p>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
