import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamificationApi } from '../api/gamification'
import { useGamificationStore } from '../store/gamificationStore'
import { useAuthStore } from '../store/authStore'
import { toast } from 'sonner'

export function useGamification() {
  const { token } = useAuthStore()
  const { setUserXP, setAchievements, setDailyTasks, completeTask } = useGamificationStore()
  const queryClient = useQueryClient()

  const { data: xpData } = useQuery({
    queryKey: ['gamification', 'xp'],
    queryFn: gamificationApi.getUserXP,
    enabled: !!token
  })

  const { data: achievements } = useQuery({
    queryKey: ['gamification', 'achievements'],
    queryFn: gamificationApi.getAchievements,
    enabled: !!token
  })

  const { data: dailyTasks } = useQuery({
    queryKey: ['gamification', 'daily-tasks'],
    queryFn: gamificationApi.getDailyTasks,
    enabled: !!token
  })

  useEffect(() => {
    if (xpData) setUserXP(xpData)
  }, [xpData, setUserXP])

  useEffect(() => {
    if (achievements) setAchievements(achievements)
  }, [achievements, setAchievements])

  useEffect(() => {
    if (dailyTasks) setDailyTasks(dailyTasks)
  }, [dailyTasks, setDailyTasks])

  const completeTaskMutation = useMutation({
    mutationFn: gamificationApi.completeTask,
    onSuccess: (_, taskId) => {
      completeTask(taskId)
      toast.success('Task completed! XP earned!')
      queryClient.invalidateQueries({ queryKey: ['gamification'] })
    }
  })

  return {
    completeTask: completeTaskMutation.mutate,
    isCompletingTask: completeTaskMutation.isPending
  }
}
